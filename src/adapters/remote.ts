// Remote adapter-map pipeline — PRD 5.3 / 5.5 / EPIC C1+C2.
//
// Pure, dependency-injected logic for: validating an untrusted (remote/cached)
// adapter map, gating it by version, selecting the active map (newest VALID
// wins, bundled is the floor), and picking the right host shape by fingerprint.
// [INVARIANT] Never throws and never lets a malformed/poisoned map through — a
// bad map falls back to the bundled snapshot so the host page can't be bricked.

import type { HostId, TokenKey } from '@/src/themes/types';
import { TOKEN_KEYS } from '@/src/themes/types';
import { BUNDLED_ADAPTER_MAP } from './map';
import type {
  AdapterMap,
  AnchorRule,
  FingerprintSignals,
  HostAdapter,
  TokenFormat,
} from './types';

const HOSTS: HostId[] = ['chatgpt', 'claude'];
const TOKEN_FORMATS: TokenFormat[] = ['color', 'hsl-triple'];
const TOKEN_SET = new Set<string>(TOKEN_KEYS);

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function validTokenMap(v: unknown): Partial<Record<string, TokenKey>> | null {
  if (!isObj(v)) return null;
  const out: Record<string, TokenKey> = {};
  for (const [k, val] of Object.entries(v)) {
    if (!isStr(val) || !TOKEN_SET.has(val)) return null;
    out[k] = val as TokenKey;
  }
  return out;
}

function validAnchor(v: unknown): AnchorRule | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.selector) || !isObj(v.style)) return null;
  const style: Record<string, TokenKey> = {};
  for (const [prop, tk] of Object.entries(v.style)) {
    if (!isStr(tk) || !TOKEN_SET.has(tk)) return null;
    style[prop] = tk as TokenKey;
  }
  const anchor: AnchorRule = { id: v.id, selector: v.selector, style };
  if (typeof v.optional === 'boolean') anchor.optional = v.optional;
  return anchor;
}

function validSignals(v: unknown): FingerprintSignals | undefined {
  if (!isObj(v)) return undefined;
  const out: FingerprintSignals = {};
  if (Array.isArray(v.cssVars) && v.cssVars.every(isStr)) out.cssVars = v.cssVars as string[];
  if (Array.isArray(v.selectors) && v.selectors.every(isStr))
    out.selectors = v.selectors as string[];
  return Object.keys(out).length ? out : undefined;
}

/** Validate one host adapter. Returns a cleaned adapter or null. */
export function validateHostAdapter(v: unknown): HostAdapter | null {
  if (!isObj(v)) return null;
  if (!isStr(v.host) || !HOSTS.includes(v.host as HostId)) return null;
  if (!isStr(v.fingerprint)) return null;
  if (!isStr(v.tokenFormat) || !TOKEN_FORMATS.includes(v.tokenFormat as TokenFormat)) return null;
  const tokenVars = validTokenMap(v.tokenVars);
  if (!tokenVars) return null;
  if (!Array.isArray(v.anchors)) return null;
  const anchors: AnchorRule[] = [];
  for (const a of v.anchors) {
    const anchor = validAnchor(a);
    if (!anchor) return null;
    anchors.push(anchor);
  }
  const adapter: HostAdapter = {
    host: v.host as HostId,
    fingerprint: v.fingerprint,
    tokenFormat: v.tokenFormat as TokenFormat,
    tokenVars,
    anchors,
  };
  const signals = validSignals(v.signals);
  if (signals) adapter.signals = signals;
  if (typeof v.codeFollowsOsScheme === 'boolean') adapter.codeFollowsOsScheme = v.codeFollowsOsScheme;
  // colorMode is passed through loosely (shape-checked) — it's host-defined data.
  if (isObj(v.colorMode) && (v.colorMode.type === 'class' || v.colorMode.type === 'attribute')) {
    adapter.colorMode = v.colorMode as HostAdapter['colorMode'];
  }
  return adapter;
}

/**
 * Validate an untrusted adapter map. Every host must be present and valid, or
 * the whole map is rejected (null) — a partial map is never adopted.
 */
export function validateAdapterMap(input: unknown): AdapterMap | null {
  if (!isObj(input) || typeof input.version !== 'number' || !isObj(input.hosts)) return null;
  const hosts = {} as Record<HostId, HostAdapter>;
  for (const h of HOSTS) {
    const adapter = validateHostAdapter((input.hosts as Record<string, unknown>)[h]);
    if (!adapter || adapter.host !== h) return null;
    hosts[h] = adapter;
  }
  const map: AdapterMap = { version: input.version, hosts };

  if (isObj(input.killSwitch)) {
    const ks: Partial<Record<HostId, boolean>> = {};
    for (const h of HOSTS) {
      const v = (input.killSwitch as Record<string, unknown>)[h];
      if (typeof v === 'boolean') ks[h] = v;
    }
    map.killSwitch = ks;
  }
  if (isObj(input.disabledAnchors)) {
    const da: Partial<Record<HostId, string[]>> = {};
    for (const h of HOSTS) {
      const list = (input.disabledAnchors as Record<string, unknown>)[h];
      if (Array.isArray(list) && list.every(isStr)) da[h] = list as string[];
    }
    map.disabledAnchors = da;
  }
  if (isObj(input.variants)) {
    const vs: Partial<Record<HostId, HostAdapter[]>> = {};
    for (const h of HOSTS) {
      const list = (input.variants as Record<string, unknown>)[h];
      if (!Array.isArray(list)) continue;
      const cleaned: HostAdapter[] = [];
      for (const item of list) {
        const a = validateHostAdapter(item);
        if (!a || a.host !== h) return null; // a malformed variant invalidates the map
        cleaned.push(a);
      }
      if (cleaned.length) vs[h] = cleaned;
    }
    if (Object.keys(vs).length) map.variants = vs;
  }
  return map;
}

/** A candidate is adopted only if it validates AND its version is strictly newer. */
export function selectActiveMap(cachedRemote: unknown, bundled: AdapterMap = BUNDLED_ADAPTER_MAP): AdapterMap {
  const remote = validateAdapterMap(cachedRemote);
  if (remote && remote.version > bundled.version) return remote;
  return bundled;
}

// --- Fingerprint selection (PRD 5.5) ---

export interface SignalEnv {
  /** Returns true if a CSS custom property is defined on :root. */
  hasCssVar: (name: string) => boolean;
  /** Returns true if a selector resolves in the document. */
  hasSelector: (sel: string) => boolean;
}

/** Build a SignalEnv from a live DOM (defaults to the global document/window). */
export function domSignalEnv(doc: Document = document, win: Window = window): SignalEnv {
  const root = doc.documentElement;
  const style = win.getComputedStyle(root);
  return {
    hasCssVar: (name) => style.getPropertyValue(name).trim() !== '',
    hasSelector: (sel) => {
      try {
        return doc.querySelector(sel) !== null;
      } catch {
        return false;
      }
    },
  };
}

export function signalsMatch(signals: FingerprintSignals | undefined, env: SignalEnv): boolean {
  if (!signals) return true; // no signals = wildcard match
  if (signals.cssVars && !signals.cssVars.every((v) => env.hasCssVar(v))) return false;
  if (signals.selectors && !signals.selectors.every((s) => env.hasSelector(s))) return false;
  return true;
}

/**
 * Pick the host adapter whose fingerprint matches the live page. Variants are
 * tried first (more specific shapes), then the default host adapter. Falls back
 * to the default adapter if nothing matches, so the page is never left unthemed
 * just because a new shape wasn't recognized.
 */
export function adapterForHost(map: AdapterMap, host: HostId, env: SignalEnv): HostAdapter {
  const candidates = [...(map.variants?.[host] ?? []), map.hosts[host]];
  for (const c of candidates) if (signalsMatch(c.signals, env)) return c;
  return map.hosts[host];
}

/** Anchors to actually apply, after removing surface-level kill-switch entries. */
export function activeAnchors(map: AdapterMap, host: HostId, adapter: HostAdapter): AnchorRule[] {
  const disabled = new Set(map.disabledAnchors?.[host] ?? []);
  return disabled.size ? adapter.anchors.filter((a) => !disabled.has(a.id)) : adapter.anchors;
}
