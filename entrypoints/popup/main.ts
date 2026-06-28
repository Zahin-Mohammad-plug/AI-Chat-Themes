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

function renderGallery(host: HostId, settings: Settings): void {
  const gallery = $('gallery');
  const themes = allThemes(settings);
  const activeId = settings.hosts[host].themeId;

  gallery.innerHTML = '';
  for (const theme of themes) {
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
    gallery.appendChild(card);
  }
}

async function init(): Promise<void> {
  const host = await getActiveHost();
  const hostLabel = $('host-label');

  if (!host) {
    hostLabel.textContent = 'No supported site';
    $('unsupported').classList.remove('hidden');
    return;
  }

  let settings = await getSettings();
  hostLabel.textContent = HOST_NAMES[host];
  $('controls').classList.remove('hidden');
  $('gallery').classList.remove('hidden');

  const toggle = $<HTMLInputElement>('enable-toggle');
  const toggleLabel = $('toggle-label');
  const syncToggle = (): void => {
    toggle.checked = settings.hosts[host].enabled;
    toggleLabel.textContent = settings.hosts[host].enabled
      ? `Theming ${HOST_NAMES[host]}`
      : `Disabled on ${HOST_NAMES[host]}`;
  };
  syncToggle();

  toggle.addEventListener('change', async () => {
    settings = await setHostEnabled(host, toggle.checked);
    syncToggle();
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
