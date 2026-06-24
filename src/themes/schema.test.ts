// Unit tests for the schema validator + base-aware fallback (PRD A2 accept).
import { describe, expect, it } from 'vitest';
import { assertBuiltinContrast, deriveTokens, normalizeTheme } from './schema';
import { BUILTIN_THEMES } from './builtins';
import { TOKEN_KEYS } from './types';

describe('deriveTokens', () => {
  it('fills every token from base defaults when partial', () => {
    const tokens = deriveTokens('dark', { accent: '#ff0000' });
    expect(tokens.accent).toBe('#ff0000');
    for (const key of TOKEN_KEYS) expect(typeof tokens[key]).toBe('string');
  });
});

describe('normalizeTheme', () => {
  it('accepts a valid theme', () => {
    const { theme, result } = normalizeTheme({
      name: 'My Theme',
      base: 'dark',
      appliesTo: ['claude'],
      tokens: { 'bg.app': '#101010' },
    });
    expect(result.ok).toBe(true);
    expect(theme?.name).toBe('My Theme');
    expect(theme?.appliesTo).toEqual(['claude']);
    expect(theme?.tokens['bg.app']).toBe('#101010');
  });

  it('fills safe defaults for a partial theme', () => {
    const { theme } = normalizeTheme({ name: 'Partial', base: 'light', tokens: {} });
    expect(theme?.tokens['text.primary']).toBeTruthy();
    expect(theme?.appliesTo).toEqual(['chatgpt', 'claude']);
  });

  it('rejects a non-object', () => {
    const { theme, result } = normalizeTheme('nope');
    expect(theme).toBeNull();
    expect(result.ok).toBe(false);
  });

  it('drops advancedCss (no raw CSS path in this version)', () => {
    const { theme, result } = normalizeTheme({
      name: 'X',
      base: 'dark',
      advancedCss: 'body{display:none}',
    });
    expect(theme?.advancedCss).toBeNull();
    expect(result.warnings.some((w) => w.includes('advancedCss'))).toBe(true);
  });

  it('warns on low body contrast but still produces a theme', () => {
    const { theme, result } = normalizeTheme({
      name: 'Bad',
      base: 'dark',
      tokens: { 'bg.surface': '#000000', 'text.primary': '#050505' },
    });
    expect(theme).not.toBeNull();
    expect(result.warnings.some((w) => w.toLowerCase().includes('contrast'))).toBe(true);
  });
});

describe('built-in themes', () => {
  it('all pass WCAG AA body contrast', () => {
    for (const theme of BUILTIN_THEMES) {
      expect(() => assertBuiltinContrast(theme)).not.toThrow();
    }
  });
});
