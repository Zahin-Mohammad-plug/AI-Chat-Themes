// Storage layer — PRD Section 14. Local-first; fully functional offline.
// chrome.storage.local holds installed custom themes, per-host active theme,
// and per-host on/off. Remote is never a hard dependency for applying a theme.

import { ADAPTER_MAP_CACHE_KEY } from '@/src/config';
import { BUILTIN_THEMES, DEFAULT_THEME_ID, getBuiltin } from '@/src/themes/builtins';
import { normalizeTheme } from '@/src/themes/schema';
import type { HostId, Theme } from '@/src/themes/types';

export interface HostSettings {
  enabled: boolean;
  themeId: string;
}

export interface Settings {
  schemaVersion: number;
  hosts: Record<HostId, HostSettings>;
  /** User-created/imported themes (validated before persistence). */
  customThemes: Theme[];
  /** Opt-in anonymous structural telemetry (PRD 5.4). Off by default. */
  telemetryEnabled: boolean;
}

const STORAGE_KEY = 'act:settings';
const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SETTINGS_VERSION,
  hosts: {
    chatgpt: { enabled: true, themeId: DEFAULT_THEME_ID },
    claude: { enabled: true, themeId: DEFAULT_THEME_ID },
  },
  customThemes: [],
  telemetryEnabled: false,
};

function mergeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return structuredCloneSafe(DEFAULT_SETTINGS);
  const r = raw as Partial<Settings>;
  const hosts = r.hosts ?? ({} as Settings['hosts']);
  // Re-validate any persisted custom themes; drop the unrecoverable ones.
  const customThemes: Theme[] = Array.isArray(r.customThemes)
    ? r.customThemes
        .map((t) => normalizeTheme(t).theme)
        .filter((t): t is Theme => t !== null)
    : [];
  return {
    schemaVersion: SETTINGS_VERSION,
    hosts: {
      chatgpt: { ...DEFAULT_SETTINGS.hosts.chatgpt, ...hosts.chatgpt },
      claude: { ...DEFAULT_SETTINGS.hosts.claude, ...hosts.claude },
    },
    customThemes,
    telemetryEnabled: typeof r.telemetryEnabled === 'boolean' ? r.telemetryEnabled : false,
  };
}

export async function getSettings(): Promise<Settings> {
  const got = await chrome.storage.local.get(STORAGE_KEY);
  return mergeSettings(got[STORAGE_KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

export async function setHostEnabled(host: HostId, enabled: boolean): Promise<Settings> {
  const settings = await getSettings();
  settings.hosts[host].enabled = enabled;
  await saveSettings(settings);
  return settings;
}

export async function setHostTheme(host: HostId, themeId: string): Promise<Settings> {
  const settings = await getSettings();
  settings.hosts[host].themeId = themeId;
  await saveSettings(settings);
  return settings;
}

/** All themes available to the user (built-ins first, then custom). */
export function allThemes(settings: Settings): Theme[] {
  return [...BUILTIN_THEMES, ...settings.customThemes];
}

export function findTheme(settings: Settings, themeId: string): Theme | undefined {
  return getBuiltin(themeId) ?? settings.customThemes.find((t) => t.id === themeId);
}

/** The theme to apply for a host, honoring the per-host enable flag. */
export function activeThemeForHost(settings: Settings, host: HostId): Theme | null {
  const hs = settings.hosts[host];
  if (!hs.enabled) return null;
  return findTheme(settings, hs.themeId) ?? getBuiltin(DEFAULT_THEME_ID) ?? null;
}

export async function saveCustomTheme(theme: Theme): Promise<Settings> {
  const settings = await getSettings();
  const idx = settings.customThemes.findIndex((t) => t.id === theme.id);
  if (idx >= 0) settings.customThemes[idx] = theme;
  else settings.customThemes.push(theme);
  await saveSettings(settings);
  return settings;
}

export async function setTelemetryEnabled(enabled: boolean): Promise<Settings> {
  const settings = await getSettings();
  settings.telemetryEnabled = enabled;
  await saveSettings(settings);
  return settings;
}

/** Read the cached remote adapter map (raw, unvalidated). Validate before use. */
export async function getCachedAdapterMap(): Promise<unknown> {
  const got = await chrome.storage.local.get(ADAPTER_MAP_CACHE_KEY);
  return got[ADAPTER_MAP_CACHE_KEY];
}

/** Persist a fetched+validated remote adapter map. */
export async function setCachedAdapterMap(map: unknown): Promise<void> {
  await chrome.storage.local.set({ [ADAPTER_MAP_CACHE_KEY]: map });
}

export function onSettingsChanged(cb: (settings: Settings) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ): void => {
    if (area === 'local' && changes[STORAGE_KEY]) cb(mergeSettings(changes[STORAGE_KEY].newValue));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
