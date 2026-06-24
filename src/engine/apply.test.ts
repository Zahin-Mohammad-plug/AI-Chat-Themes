// Engine tests for CSS generation (PRD A3) — pure, no DOM needed.
import { describe, expect, it } from 'vitest';
import { buildThemeCss } from './apply';
import { BUNDLED_ADAPTER_MAP } from '@/src/adapters/map';
import { getBuiltin } from '@/src/themes/builtins';
import type { Theme } from '@/src/themes/types';

const dark = getBuiltin('builtin-dark') as Theme;

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
