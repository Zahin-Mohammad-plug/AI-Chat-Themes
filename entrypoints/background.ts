// Background service worker — PRD Section 8.
// In this M0/M1 slice it owns first-run defaults. The remote adapter-map fetch,
// integrity check, cache, and kill-switch wiring land in M3 (stubbed here so the
// surface exists without violating MV3 — no remote code, ever).

import { defineBackground } from 'wxt/sandbox';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '@/src/storage';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      // Seed defaults so themes apply immediately on first run.
      await saveSettings(DEFAULT_SETTINGS);
    } else {
      // Reconcile/migrate existing settings against the current schema.
      const settings = await getSettings();
      await saveSettings(settings);
    }
  });

  // M3 stub: remote adapter-map refresh would be scheduled here via
  // chrome.alarms, fetching versioned JSON/CSS only, integrity-checked, with
  // automatic fallback to the bundled snapshot. Intentionally not implemented
  // in this slice.
});
