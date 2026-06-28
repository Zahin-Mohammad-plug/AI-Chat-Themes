// Content script — runs at document_start on both hosts. PRD Sections 8, 9, 11.1.
// Responsibilities: pre-paint cloak (sync), read cached active theme + adapter
// map (async), pick the host shape by fingerprint, apply tokens + anchors,
// reveal, run the health check, self-heal/degrade on misses, optionally emit
// opt-in structural telemetry, and observe dynamic surfaces.

import { defineContentScript } from 'wxt/sandbox';
import { BUNDLED_ADAPTER_MAP, hostFromUrl } from '@/src/adapters/map';
import {
  activeAnchors,
  adapterForHost,
  domSignalEnv,
  selectActiveMap,
} from '@/src/adapters/remote';
import type { HostAdapter } from '@/src/adapters/types';
import { TELEMETRY_MSG } from '@/src/config';
import {
  applyThemeToDocument,
  captureColorMode,
  injectCloak,
  removeCloak,
  removeTheme,
  restoreColorMode,
  type ColorModeSnapshot,
} from '@/src/engine/apply';
import { runHealthCheck } from '@/src/engine/health';
import { startObserver } from '@/src/engine/observer';
import { buildTelemetryEvent } from '@/src/engine/telemetry';
import {
  activeThemeForHost,
  getCachedAdapterMap,
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

    // The bundled adapter governs the synchronous pre-paint phase; the active
    // adapter (possibly a remote/cached shape, fingerprint-selected) is resolved
    // once async storage reads complete.
    let adapter: HostAdapter = BUNDLED_ADAPTER_MAP.hosts[host];
    let killed = BUNDLED_ADAPTER_MAP.killSwitch?.[host] === true;
    let mapVersion = BUNDLED_ADAPTER_MAP.version;
    const extVersion = chrome.runtime.getManifest().version;

    // Capture the host's native color mode before we touch it, so turning theming
    // off restores the user's original light/dark setting.
    const originalMode: ColorModeSnapshot = captureColorMode(adapter);

    // 1) Pre-paint cloak from the synchronous snapshot (no white flash).
    if (!killed) {
      const snap = readCloakSnapshot(host);
      if (snap) injectCloak(snap.bg, snap.text);
    }

    // 2) Failsafe: reveal unconditionally after a short bound, even on failure.
    const failsafe = setTimeout(() => removeCloak(), REVEAL_FAILSAFE_MS);
    const reveal = (): void => {
      clearTimeout(failsafe);
      removeCloak();
    };

    let activeTheme: Theme | null = null;

    const apply = (settings: Settings): void => {
      if (killed) {
        removeTheme();
        restoreColorMode(adapter, originalMode);
        reveal();
        return;
      }
      const theme = activeThemeForHost(settings, host);
      activeTheme = theme;
      if (theme) {
        applyThemeToDocument(theme, adapter);
        writeCloakSnapshot(host, theme);
        // Health check (PRD 5.4): unresolved anchors mean the host changed shape.
        // Missing anchors simply weren't applied (degrade to native, never half-
        // themed); report them only if the user opted into telemetry.
        const report = runHealthCheck(adapter);
        if (report.missing.length) {
          console.debug('[AI Chat Themes] unresolved anchors', report.missing);
          if (settings.telemetryEnabled) {
            const event = buildTelemetryEvent(report, { extVersion, mapVersion, now: Date.now() });
            if (event) {
              try {
                chrome.runtime.sendMessage({ type: TELEMETRY_MSG, event });
              } catch {
                /* worker may be asleep; telemetry is best-effort */
              }
            }
          }
        }
      } else {
        removeTheme();
        restoreColorMode(adapter, originalMode);
        clearCloakSnapshot(host);
      }
      reveal();
    };

    // 3) Async init: resolve the active adapter map (cached-or-bundled), pick the
    // host shape by fingerprint, then apply and keep in sync with popup changes.
    Promise.all([getSettings(), getCachedAdapterMap()])
      .then(([settings, cachedMap]) => {
        const map = selectActiveMap(cachedMap);
        mapVersion = map.version;
        killed = map.killSwitch?.[host] === true;
        const picked = adapterForHost(map, host, domSignalEnv());
        // Apply the surface-level kill switch (PRD 5.4).
        adapter = { ...picked, anchors: activeAnchors(map, host, picked) };

        apply(settings);
        startWhenReady(() => {
          startObserver(() => {
            if (activeTheme) applyThemeToDocument(activeTheme, adapter);
          });
        });
      })
      .catch(() => reveal());

    onSettingsChanged((settings) => apply(settings));
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
