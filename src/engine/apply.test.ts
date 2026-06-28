// Engine tests for CSS generation (PRD A3) — pure, no DOM needed.
import { describe, expect, it } from 'vitest';
import { applyColorMode, buildThemeCss, captureColorMode, restoreColorMode } from './apply';
import { BUNDLED_ADAPTER_MAP } from '@/src/adapters/map';
import { getBuiltin } from '@/src/themes/builtins';
import type { Theme } from '@/src/themes/types';

const dark = getBuiltin('builtin-dark') as Theme;

/** Minimal element stub with classList/attribute support. */
function fakeEl(initialClass = '', attrs: Record<string, string> = {}) {
  const classes = new Set(initialClass.split(' ').filter(Boolean));
  const a: Record<string, string> = { ...attrs };
  return {
    classes,
    attrs: a,
    classList: {
      contains: (c: string) => classes.has(c),
      toggle: (c: string, on?: boolean) => {
        const want = on ?? !classes.has(c);
        if (want) classes.add(c);
        else classes.delete(c);
        return want;
      },
      remove: (c: string) => classes.delete(c),
    },
    getAttribute: (n: string) => (n in a ? a[n] : null),
    setAttribute: (n: string, v: string) => {
      a[n] = v;
    },
    removeAttribute: (n: string) => {
      delete a[n];
    },
    style: { colorScheme: '' },
  };
}

/** Minimal document stub for color-mode tests (vitest runs in node). */
function fakeDoc(initialClass = '', attrs: Record<string, string> = {}, scopeEls: any[] = []) {
  const documentElement = fakeEl(initialClass, attrs);
  const doc = {
    documentElement,
    querySelectorAll: (_sel: string) => scopeEls,
  } as unknown as Document;
  return { doc, classes: documentElement.classes, attrs: documentElement.attrs, documentElement };
}

describe('buildThemeCss (ChatGPT, color format)', () => {
  const css = buildThemeCss(dark, BUNDLED_ADAPTER_MAP.hosts.chatgpt);

  it('overrides host color tokens with raw hex + !important', () => {
    expect(css).toContain('--bg-primary: #0e0e10 !important;');
    expect(css).toContain('--text-primary: #ececec !important;');
  });

  it('emits semantic anchor rules', () => {
    expect(css).toContain('html, body {');
    expect(css).toContain('background-color: #0e0e10 !important;');
  });

  it('publishes namespaced --act-* vars', () => {
    expect(css).toContain('--act-bg-app: #0e0e10;');
  });
});

describe('applyColorMode — ChatGPT (class mechanism)', () => {
  const adapter = BUNDLED_ADAPTER_MAP.hosts.chatgpt;

  it('removes the dark class for a light theme', () => {
    const f = fakeDoc('dark some-other');
    applyColorMode('light', adapter, f.doc);
    expect(f.classes.has('dark')).toBe(false);
    expect(f.documentElement.style.colorScheme).toBe('light');
  });

  it('adds the dark class for a dark/amoled theme', () => {
    const f = fakeDoc('');
    applyColorMode('amoled', adapter, f.doc);
    expect(f.classes.has('dark')).toBe(true);
    expect(f.documentElement.style.colorScheme).toBe('dark');
  });

  it('restores the original mode on toggle-off', () => {
    const f = fakeDoc('dark');
    const snap = captureColorMode(adapter, f.doc);
    applyColorMode('light', adapter, f.doc);
    expect(f.classes.has('dark')).toBe(false);
    restoreColorMode(adapter, snap, f.doc);
    expect(f.classes.has('dark')).toBe(true);
  });
});

describe('applyColorMode — Claude (attribute mechanism)', () => {
  const adapter = BUNDLED_ADAPTER_MAP.hosts.claude;

  it('sets data-mode=light for a light theme', () => {
    const f = fakeDoc('', { 'data-mode': 'dark' });
    applyColorMode('light', adapter, f.doc);
    expect(f.attrs['data-mode']).toBe('light');
  });

  it('sets data-mode=dark for a dark theme', () => {
    const f = fakeDoc('', { 'data-mode': 'light' });
    applyColorMode('dark', adapter, f.doc);
    expect(f.attrs['data-mode']).toBe('dark');
  });

  it('propagates the mode to scope elements (.cds-root) and clears on restore', () => {
    const cds = fakeEl();
    const f = fakeDoc('', {}, [cds]);
    applyColorMode('dark', adapter, f.doc);
    expect(cds.attrs['data-mode']).toBe('dark'); // scope marked dark
    const snap = captureColorMode(adapter, f.doc);
    restoreColorMode(adapter, snap, f.doc);
    expect('data-mode' in cds.attrs).toBe(false); // scope marker cleared
  });
});

describe('buildThemeCss (Claude, hsl-triple format)', () => {
  const css = buildThemeCss(dark, BUNDLED_ADAPTER_MAP.hosts.claude);

  it('converts colors to bare H S% L% triples for hsl(var()) consumption', () => {
    // #0e0e10 -> 240 6.7% 6.3% (approx); assert the no-# triple shape, not raw hex.
    const m = css.match(/--bg-000: ([^;]+) !important;/);
    expect(m).toBeTruthy();
    expect(m![1]).not.toContain('#');
    expect(m![1]).toMatch(/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/);
  });
});

describe('buildThemeCss — schema-v2 expressive layers', () => {
  const aurora = getBuiltin('builtin-aurora') as Theme;
  const forest = getBuiltin('builtin-forest') as Theme;
  const cyber = getBuiltin('builtin-cyberpunk') as Theme;
  const paper = getBuiltin('builtin-paper') as Theme;

  it('paints a gradient on the app shell for Aurora (both hosts)', () => {
    for (const host of ['chatgpt', 'claude'] as const) {
      const css = buildThemeCss(aurora, BUNDLED_ADAPTER_MAP.hosts[host]);
      expect(css).toContain('html, body, main {');
      expect(css).toContain('background-image: linear-gradient(135deg');
      expect(css).toContain('background-attachment: fixed !important;');
    }
  });

  it('layers a readability scrim over the texture for Forest', () => {
    const css = buildThemeCss(forest, BUNDLED_ADAPTER_MAP.hosts.chatgpt);
    // scrim = solid wash of bg.app (#0c1a12 -> rgb 12,26,18) over the data URI
    expect(css).toContain('background-image: linear-gradient(rgba(12, 26, 18,');
    expect(css).toContain('data:image/svg+xml');
  });

  it('emits an accent glow for Cyberpunk', () => {
    const css = buildThemeCss(cyber, BUNDLED_ADAPTER_MAP.hosts.claude);
    expect(css).toContain('text-shadow: 0 0 8px rgba(255,43,214,0.7) !important;');
  });

  it('emits no expressive layers for a plain palette theme', () => {
    const css = buildThemeCss(paper, BUNDLED_ADAPTER_MAP.hosts.chatgpt);
    expect(css).not.toContain('background-attachment: fixed');
    expect(css).not.toContain('text-shadow');
  });
});
