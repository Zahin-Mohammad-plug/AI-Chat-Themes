// Content script — runs at document_start on both hosts. PRD Sections 8, 9, 11.1.
// Responsibilities: pre-paint cloak (sync), read cached active theme (async),
// apply tokens + anchors, reveal, run health check, observe dynamic surfaces.

import { defineContentScript } from 'wxt/sandbox';
import { BUNDLED_ADAPTER_MAP, hostFromUrl } from '@/src/adapters/map';
import { applyThemeToDocument, injectCloak, removeCloak, removeTheme } from '@/src/engine/apply';
import { runHealthCheck } from '@/src/engine/health';
import { startObserver, type ObserverHandle } from '@/src/engine/observer';
import {
  activeThemeForHost,
  getSettings,
  onSettingsChanged,
  type Settings,
} from '@/src/storage';
import type { HostId, Theme } from '@/src/themes/types';

const REVEAL_FAILSAFE_MS = 800;

function cloakKey(host: HostId): string {
  return `act:cloak:${host}`;
}

/** Synchronously read the last cloak snapshot from the page's localStorage. */
function readCloakSnapshot(host: HostId): { bg: string; text: string } | null {
  try {
    const raw = localStorage.getItem(cloakKey(host));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.bg === 'string' && typeof parsed.text === 'string') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCloakSnapshot(host: HostId, theme: Theme): void {
  try {
    localStorage.setItem(
      cloakKey(host),
      JSON.stringify({ bg: theme.tokens['bg.app'], text: theme.tokens['text.primary'] }),
    );
  } catch {
    /* storage may be unavailable; cloak just won't pre-paint next load */
  }
}

function clearCloakSnapshot(host: HostId): void {
  try {
    localStorage.removeItem(cloakKey(host));
  } catch {
    /* ignore */
  }
}

export default defineContentScript({
  matches: ['*://chatgpt.com/*', '*://claude.ai/*'],
  runAt: 'document_start',
  main() {
    const host = hostFromUrl(location.href);
    if (!host) return;

    const adapter = BUNDLED_ADAPTER_MAP.hosts[host];
    const killed = BUNDLED_ADAPTER_MAP.killSwitch?.[host] === true;

    // 1) Pre-paint cloak from the synchronous snapshot (no white flash).
    let cloaked = false;
    if (!killed) {
      const snap = readCloakSnapshot(host);
      if (snap) {
        injectCloak(snap.bg, snap.text);
        cloaked = true;
      }
    }

    // 2) Failsafe: reveal unconditionally after a short bound, even on failure.
    const failsafe = setTimeout(() => removeCloak(), REVEAL_FAILSAFE_MS);
    const reveal = (): void => {
      clearTimeout(failsafe);
      removeCloak();
    };

    let observer: ObserverHandle | null = null;
    let activeTheme: Theme | null = null;

    const apply = (settings: Settings): void => {
      if (killed) {
        removeTheme();
        reveal();
        return;
      }
      const theme = activeThemeForHost(settings, host);
      activeTheme = theme;
      if (theme) {
        applyThemeToDocument(theme, adapter);
        writeCloakSnapshot(host, theme);
        // Health check: record (console-only in this slice) unresolved anchors.
        const report = runHealthCheck(adapter);
        if (report.missing.length) {
          console.debug('[AI Chat Themes] unresolved anchors', report.missing);
        }
      } else {
        removeTheme();
        clearCloakSnapshot(host);
      }
      reveal();
    };

    // 3) Async init from storage, then keep in sync with popup/editor changes.
    getSettings()
      .then((settings) => {
        apply(settings);
        startWhenReady(() => {
          observer = startObserver(() => {
            if (activeTheme) applyThemeToDocument(activeTheme, adapter);
          });
        });
      })
      .catch(() => reveal());

    onSettingsChanged((settings) => apply(settings));

    if (cloaked) {
      // keep type-checker happy about the variable being used in all branches
    }
  },
});

/** Run a callback once document.body exists (observer needs a target). */
function startWhenReady(fn: () => void): void {
  if (document.body) {
    fn();
    return;
  }
  const onReady = (): void => {
    document.removeEventListener('DOMContentLoaded', onReady);
    fn();
  };
  document.addEventListener('DOMContentLoaded', onReady);
}
