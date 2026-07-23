// Background service worker — PRD Section 8 / EPIC C1+C4.
// Owns: first-run defaults; the remote adapter-map refresh (fetch → validate →
// cache, stale-while-revalidate, bundled fallback); and relaying opt-in
// structural telemetry. [INVARIANT] Only JSON data is fetched — never code.

import { defineBackground } from 'wxt/sandbox';
import { BUNDLED_ADAPTER_MAP, hostFromUrl } from '@/src/adapters/map';
import { selectActiveMap, validateAdapterMap } from '@/src/adapters/remote';
import {
  MAP_REFRESH_MINUTES,
  REMOTE_MAP_URL,
  TELEMETRY_MSG,
  TELEMETRY_URL,
} from '@/src/config';
import {
  DEFAULT_SETTINGS,
  getCachedAdapterMap,
  getSettings,
  saveSettings,
  setCachedAdapterMap,
} from '@/src/storage';

const REFRESH_ALARM = 'act:map-refresh';

/**
 * Fetch the remote adapter map, validate it, and cache it only if it is a valid,
 * strictly-newer version than what we already trust. Any failure (offline, 404,
 * malformed, tampered, older) leaves the existing cache/bundled map untouched.
 */
async function refreshAdapterMap(): Promise<void> {
  if (!REMOTE_MAP_URL) return; // remote updates disabled until configured
  try {
    const res = await fetch(REMOTE_MAP_URL, { cache: 'no-cache' });
    if (!res.ok) return;
    const json: unknown = await res.json();
    const validated = validateAdapterMap(json);
    if (!validated) return; // malformed/poisoned — never adopt

    // Only adopt if strictly newer than both the bundled floor and any cache.
    const current = selectActiveMap(await getCachedAdapterMap(), BUNDLED_ADAPTER_MAP);
    if (validated.version > current.version) {
      await setCachedAdapterMap(validated);
    }
  } catch {
    // Network/parse failure: silently keep the cached/bundled map (PRD 16).
  }
}

/** Relay an opt-in telemetry event to the collector (no-op unless configured). */
async function relayTelemetry(event: unknown): Promise<void> {
  if (!TELEMETRY_URL) return;
  const { telemetryEnabled } = await getSettings();
  if (!telemetryEnabled) return; // double-gate: never send unless opted in
  try {
    await fetch(TELEMETRY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    /* telemetry is best-effort; failures are ignored */
  }
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      await saveSettings(DEFAULT_SETTINGS);
      // First-run handling. MV3 does NOT inject content scripts into tabs that
      // were already open before install, so a user who installs while ChatGPT/
      // Claude is open sees nothing until they reload — the #1 "doesn't work"
      // report. Reload any open host tabs so the theme applies immediately, and
      // open a welcome page so the install is visibly confirmed. Uses host
      // permissions only (no `tabs`/`scripting` permission needed).
      try {
        const openHostTabs = await chrome.tabs.query({
          url: ['*://chatgpt.com/*', '*://claude.ai/*'],
        });
        // Double-check each URL actually resolves to a supported host before
        // reloading, so we never disturb an unrelated tab even if the query
        // filter were ever ignored.
        for (const t of openHostTabs) {
          if (t.id != null && hostFromUrl(t.url) != null) void chrome.tabs.reload(t.id);
        }
      } catch {
        /* best-effort: nothing open, or query blocked */
      }
      try {
        await chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
      } catch {
        /* welcome page is best-effort */
      }
    } else {
      // Reconcile/migrate existing settings against the current schema.
      await saveSettings(await getSettings());
    }
    // Schedule the periodic remote-map refresh — ONLY when remote updates are
    // configured. With REMOTE_MAP_URL null (default) we touch neither the
    // network nor chrome.alarms, so the package needs no `alarms` permission.
    // [NOTE] Re-add `"alarms"` to the manifest when you set REMOTE_MAP_URL.
    if (REMOTE_MAP_URL) {
      chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: MAP_REFRESH_MINUTES });
      void refreshAdapterMap();
    }
  });

  chrome.runtime.onStartup?.addListener(() => void refreshAdapterMap());

  if (REMOTE_MAP_URL) {
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === REFRESH_ALARM) void refreshAdapterMap();
    });
  }

  // Telemetry relay from content scripts (opt-in, structurally limited payload).
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && typeof msg === 'object' && msg.type === TELEMETRY_MSG) {
      void relayTelemetry(msg.event);
    }
    return false;
  });
});
