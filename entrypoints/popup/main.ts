// Popup control surface — PRD Section 10.1 / EPIC D1.
// Shows active theme, gallery, per-host toggle, and the unsupported-site state.
// Apply/switch is instant: writes to storage; the content script re-applies live.

import { hostFromUrl } from '@/src/adapters/map';
import { resolveTexture } from '@/src/themes/assets';
import { BUILTIN_BLURBS } from '@/src/themes/builtins';
import {
  allThemes,
  getSettings,
  setHostEnabled,
  setHostTheme,
  type Settings,
} from '@/src/storage';
import type { HostId, Theme } from '@/src/themes/types';

const HOST_NAMES: Record<HostId, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude.ai',
};

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

// Rounded popup corners are safe only on macOS (transparent popup backing);
// elsewhere the backing is opaque, so keep square corners. See style.css.
type UAData = { platform?: string };
const platform =
  (navigator as Navigator & { userAgentData?: UAData }).userAgentData?.platform ??
  navigator.platform ??
  '';
if (/mac/i.test(platform)) document.documentElement.classList.add('is-mac');

async function getActiveHost(): Promise<HostId | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return hostFromUrl(tab?.url);
}

/** A wide preview bar showing the expressive ambiance (gradient/texture), if any. */
function previewBar(theme: Theme): string {
  if (theme.effects?.appGradient) {
    return `<div class="preview" style="background:${theme.effects.appGradient}"></div>`;
  }
  if (theme.material) {
    const tex = resolveTexture(theme.material.texture);
    if (tex) {
      return `<div class="preview" style="background-image:${tex};background-size:cover;background-position:center"></div>`;
    }
  }
  return '';
}

function swatch(theme: Theme): string {
  const t = theme.tokens;
  const cells = [t['bg.app'], t['bg.surface'], t['bg.elevated'], t.accent]
    .map((c) => `<span style="background:${c}"></span>`)
    .join('');
  return previewBar(theme) + `<div class="swatch">${cells}</div>`;
}

function makeCard(host: HostId, theme: Theme, activeId: string): HTMLButtonElement {
  const card = document.createElement('button');
  card.className = 'theme-card' + (theme.id === activeId ? ' active' : '');
  card.type = 'button';
  card.setAttribute('aria-pressed', String(theme.id === activeId));
  const blurb = BUILTIN_BLURBS[theme.id] ?? (theme.builtin ? '' : 'Custom theme');
  card.innerHTML =
    swatch(theme) +
    `<div class="theme-name">${escapeHtml(theme.name)}</div>` +
    (blurb ? `<div class="theme-blurb">${escapeHtml(blurb)}</div>` : '');
  card.addEventListener('click', async () => {
    const next = await setHostTheme(host, theme.id);
    renderGallery(host, next);
  });
  return card;
}

function renderGallery(host: HostId, settings: Settings): void {
  const gallery = $('gallery');
  const themes = allThemes(settings);
  const activeId = settings.hosts[host].themeId;
  const builtins = themes.filter((t) => t.builtin);
  const expressive = (t: Theme): boolean => t.class === 'expressive';

  // Stylized themes (gradient/textured) · Color themes (palette) · Your themes.
  const groups: { title: string; items: Theme[] }[] = [
    { title: 'Stylized themes', items: builtins.filter(expressive) },
    { title: 'Color themes', items: builtins.filter((t) => !expressive(t)) },
    { title: 'Your themes', items: themes.filter((t) => !t.builtin) },
  ];

  gallery.innerHTML = '';
  for (const g of groups) {
    if (!g.items.length) continue;
    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = g.title;
    gallery.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'group-grid';
    for (const theme of g.items) grid.appendChild(makeCard(host, theme, activeId));
    gallery.appendChild(grid);
  }
}

async function init(): Promise<void> {
  const host = await getActiveHost();

  // Open the theme editor (deep-linking the current host's active theme if any).
  $('open-editor').addEventListener('click', async () => {
    let url = chrome.runtime.getURL('editor.html');
    if (host) {
      const s = await getSettings();
      url += `?theme=${encodeURIComponent(s.hosts[host].themeId)}`;
    }
    await chrome.tabs.create({ url });
  });

  // No supported host in the active tab: keep the "ChatGPT & Claude" brand,
  // hide the per-site switch + gallery, show the prompt.
  if (!host) {
    $('unsupported').classList.remove('hidden');
    return;
  }

  let settings = await getSettings();
  $('gallery').classList.remove('hidden');

  // Per-site on/off switch lives in the header, scoped to the active host.
  const toggleWrap = $('toggle-wrap');
  const toggle = $<HTMLInputElement>('enable-toggle');
  const label = `Theme ${HOST_NAMES[host]}`;
  toggleWrap.title = label;
  toggle.setAttribute('aria-label', label);
  toggle.checked = settings.hosts[host].enabled;
  toggleWrap.classList.remove('hidden');

  toggle.addEventListener('change', async () => {
    settings = await setHostEnabled(host, toggle.checked);
    toggle.checked = settings.hosts[host].enabled;
  });

  renderGallery(host, settings);
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

init().catch((err) => {
  console.error('[AI Chat Themes] popup init failed', err);
});
