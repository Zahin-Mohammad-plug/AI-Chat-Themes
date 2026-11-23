// Tests for the remote adapter-map pipeline (PRD C1 + C2).
import { describe, expect, it } from 'vitest';
import {
  activeAnchors,
  adapterForHost,
  selectActiveMap,
  signalsMatch,
  validateAdapterMap,
  type SignalEnv,
} from './remote';
import { BUNDLED_ADAPTER_MAP } from './map';
import type { AdapterMap } from './types';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe('validateAdapterMap', () => {
  it('accepts a well-formed map (the bundled snapshot round-trips)', () => {
    const map = validateAdapterMap(clone(BUNDLED_ADAPTER_MAP));
    expect(map).not.toBeNull();
    expect(map!.hosts.chatgpt.host).toBe('chatgpt');
    expect(map!.hosts.claude.tokenFormat).toBe('hsl-triple');
  });

  it('rejects a non-object / missing version / missing host', () => {
    expect(validateAdapterMap(null)).toBeNull();
    expect(validateAdapterMap({ hosts: {} })).toBeNull();
    const noClaude = clone(BUNDLED_ADAPTER_MAP) as { hosts: Record<string, unknown> };
    delete noClaude.hosts.claude;
    expect(validateAdapterMap(noClaude)).toBeNull();
  });

  it('rejects bad token format, unknown token key, and non-string selector', () => {
    const badFmt = clone(BUNDLED_ADAPTER_MAP);
    badFmt.hosts.chatgpt.tokenFormat = 'rgb' as never;
    expect(validateAdapterMap(badFmt)).toBeNull();

    const badToken = clone(BUNDLED_ADAPTER_MAP);
    badToken.hosts.chatgpt.tokenVars['--x'] = 'not.a.real.token' as never;
    expect(validateAdapterMap(badToken)).toBeNull();

    const badSel = clone(BUNDLED_ADAPTER_MAP);
    badSel.hosts.chatgpt.anchors[0]!.selector = 42 as never;
    expect(validateAdapterMap(badSel)).toBeNull();
  });

  it('keeps colorVars/varScopes, and rejects scopes that could escape the rule block', () => {
    const map = validateAdapterMap(clone(BUNDLED_ADAPTER_MAP))!;
    expect(map.hosts.claude.colorVars?.['--cds-surface-1']).toBe('bg.app');
    expect(map.hosts.claude.varScopes).toEqual(['.cds-root']);

    const evil = clone(BUNDLED_ADAPTER_MAP);
    evil.hosts.claude.varScopes = ['.cds-root } body { display:none'];
    expect(validateAdapterMap(evil)).toBeNull();

    // colorMode markers are set as attributes on <html>: only inert data-* names.
    const handler = clone(BUNDLED_ADAPTER_MAP);
    handler.hosts.claude.colorMode = { type: 'attribute', name: 'onclick', darkValue: 'x', lightValue: 'y' };
    expect(validateAdapterMap(handler)).toBeNull();
    const badAlso = clone(BUNDLED_ADAPTER_MAP);
    badAlso.hosts.chatgpt.colorMode!.alsoAttribute = { name: 'style', darkValue: 'a', lightValue: 'b' };
    expect(validateAdapterMap(badAlso)).toBeNull();
    const badVal = clone(BUNDLED_ADAPTER_MAP);
    badVal.hosts.chatgpt.colorMode!.alsoAttribute = { name: 'data-theme', darkValue: 'x" y', lightValue: 'b' };
    expect(validateAdapterMap(badVal)).toBeNull();
    expect(validateAdapterMap(clone(BUNDLED_ADAPTER_MAP))!.hosts.chatgpt.colorMode?.alsoAttribute?.name).toBe('data-theme');

    const badColor = clone(BUNDLED_ADAPTER_MAP);
    badColor.hosts.claude.colorVars = { '--cds-x': 'nope' as never };
    expect(validateAdapterMap(badColor)).toBeNull();
  });
});

describe('selectActiveMap (version gate + fallback)', () => {
  it('adopts a valid, strictly-newer remote map', () => {
    const newer = clone(BUNDLED_ADAPTER_MAP);
    newer.version = BUNDLED_ADAPTER_MAP.version + 1;
    expect(selectActiveMap(newer).version).toBe(BUNDLED_ADAPTER_MAP.version + 1);
  });

  it('keeps bundled when cache is older, equal, malformed, or absent', () => {
    const older = clone(BUNDLED_ADAPTER_MAP);
    older.version = BUNDLED_ADAPTER_MAP.version - 1;
    expect(selectActiveMap(older)).toBe(BUNDLED_ADAPTER_MAP);
    expect(selectActiveMap(clone(BUNDLED_ADAPTER_MAP))).toBe(BUNDLED_ADAPTER_MAP); // equal
    expect(selectActiveMap({ garbage: true })).toBe(BUNDLED_ADAPTER_MAP);
    expect(selectActiveMap(undefined)).toBe(BUNDLED_ADAPTER_MAP);
  });
});

describe('fingerprint selection (C2)', () => {
  const envWith = (vars: string[], sels: string[] = []): SignalEnv => ({
    hasCssVar: (n) => vars.includes(n),
    hasSelector: (s) => sels.includes(s),
  });

  it('matches when all declared signals are present, wildcard when none', () => {
    expect(signalsMatch(undefined, envWith([]))).toBe(true);
    expect(signalsMatch({ cssVars: ['--a'] }, envWith(['--a']))).toBe(true);
    expect(signalsMatch({ cssVars: ['--a', '--b'] }, envWith(['--a']))).toBe(false);
  });

  it('picks the matching variant shape over the default, else falls back', () => {
    const map: AdapterMap = clone(BUNDLED_ADAPTER_MAP);
    const variant = clone(BUNDLED_ADAPTER_MAP.hosts.chatgpt);
    variant.fingerprint = 'chatgpt-next';
    variant.signals = { selectors: ['.new-shell'] };
    map.variants = { chatgpt: [variant] };

    // New shape present -> variant chosen.
    const picked = adapterForHost(map, 'chatgpt', envWith(['--main-surface-primary'], ['.new-shell']));
    expect(picked.fingerprint).toBe('chatgpt-next');

    // New shape absent -> default chosen.
    const fallback = adapterForHost(map, 'chatgpt', envWith(['--main-surface-primary']));
    expect(fallback.fingerprint).toBe('chatgpt-2024-tokens');
  });
});

describe('activeAnchors (surface-level kill switch)', () => {
  it('drops disabled anchor ids and keeps the rest', () => {
    const map: AdapterMap = clone(BUNDLED_ADAPTER_MAP);
    map.disabledAnchors = { chatgpt: ['codeblock.body'] };
    const ids = activeAnchors(map, 'chatgpt', map.hosts.chatgpt).map((a) => a.id);
    expect(ids).not.toContain('codeblock.body');
    expect(ids).toContain('app.shell');
  });
});
