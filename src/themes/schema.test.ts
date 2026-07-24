// Unit tests for the schema validator + base-aware fallback (PRD A2 accept).
import { describe, expect, it } from 'vitest';
import {
  assertBuiltinContrast,
  deriveTokens,
  isSafeImageDataUrl,
  MAX_IMAGE_DATA_URL,
  normalizeTheme,
} from './schema';
import { BUILTIN_THEMES } from './builtins';
import { TOKEN_KEYS } from './types';

const mat = (image: unknown, scrimOpacity = 0.8) =>
  normalizeTheme({ name: 'x', base: 'dark', material: { image, scrimOpacity } }).theme;

describe('material image (user background)', () => {
  it('accepts a valid png/jpeg/webp base64 data URI', () => {
    for (const mime of ['png', 'jpeg', 'jpg', 'webp']) {
      const url = `data:image/${mime};base64,AAAABBBB`;
      expect(isSafeImageDataUrl(url)).toBe(true);
      expect(mat(url)?.material?.image).toBe(url);
    }
  });

  it('enforces the 0.65 readability scrim floor when an image is present', () => {
    const t = mat('data:image/png;base64,AAAA', 0.2);
    expect(t?.material?.scrimOpacity).toBeGreaterThanOrEqual(0.65);
  });

  it('rejects svg, gif, remote, forged-mime, non-image, and oversized', () => {
    const bad = [
      'data:image/svg+xml;base64,AAAA', // script risk
      'data:image/gif;base64,AAAA', // animation
      'https://evil.example/x.png', // remote
      'data:text/html;base64,AAAA', // not an image
      'data:image/png;base64,AAAA!!', // invalid base64 charset
      'data:image/png;base64,' + 'A'.repeat(MAX_IMAGE_DATA_URL), // oversized
    ];
    for (const image of bad) {
      expect(isSafeImageDataUrl(image)).toBe(false);
      expect(mat(image)?.material?.image).toBeUndefined();
    }
  });

  it('keeps a bundled texture even when the image is dropped', () => {
    const t = normalizeTheme({
      name: 'x',
      base: 'dark',
      material: { texture: 'forest', image: 'not-a-data-uri', scrimOpacity: 0.8 },
    }).theme;
    expect(t?.material?.texture).toBe('forest');
    expect(t?.material?.image).toBeUndefined();
  });
});

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

  it('includes the five schema-v2 showcase themes', () => {
    const ids = BUILTIN_THEMES.map((t) => t.id);
    for (const id of [
      'builtin-midnight-oled',
      'builtin-aurora',
      'builtin-forest',
      'builtin-cyberpunk',
      'builtin-paper',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('apply to both hosts', () => {
    for (const theme of BUILTIN_THEMES) {
      expect(theme.appliesTo).toEqual(['chatgpt', 'claude']);
    }
  });
});

describe('schema v2 (expressive blocks)', () => {
  it('marks a theme expressive and preserves a safe gradient', () => {
    const { theme } = normalizeTheme({
      name: 'Grad',
      base: 'light',
      effects: { appGradient: 'linear-gradient(135deg,#fff,#eee)' },
    });
    expect(theme?.class).toBe('expressive');
    expect(theme?.effects?.appGradient).toContain('linear-gradient');
  });

  it('strips effects that try to fetch an external resource', () => {
    const { theme } = normalizeTheme({
      name: 'Evil',
      base: 'dark',
      effects: { appGradient: "url('https://evil.example/leak')" },
    });
    expect(theme?.effects).toBeUndefined();
    expect(theme?.class).toBe('palette');
  });

  it('accepts a bundled material texture and clamps the scrim to a readable floor', () => {
    const { theme } = normalizeTheme({
      name: 'Tex',
      base: 'dark',
      material: { texture: 'forest', scrimOpacity: 0.1 },
    });
    expect(theme?.material?.texture).toBe('forest');
    expect(theme?.material?.scrimOpacity).toBeGreaterThanOrEqual(0.5);
  });

  it('rejects a material texture that is a raw url (not an asset id)', () => {
    const { theme } = normalizeTheme({
      name: 'Tex2',
      base: 'dark',
      material: { texture: "url('http://x')", scrimOpacity: 0.8 },
    });
    expect(theme?.material).toBeUndefined();
  });

  it('drops motion that lacks a reduced-motion fallback', () => {
    const { theme, result } = normalizeTheme({
      name: 'Mo',
      base: 'dark',
      motion: { preset: 'shimmer' },
    });
    expect(theme?.motion).toBeUndefined();
    expect(result.warnings.some((w) => w.includes('reducedMotionFallback'))).toBe(true);
  });

  it('still loads a v1 (palette-only) theme as palette', () => {
    const { theme } = normalizeTheme({
      schemaVersion: 1,
      name: 'Old',
      base: 'dark',
      tokens: { 'bg.app': '#111111' },
    });
    expect(theme?.class).toBe('palette');
    expect(theme?.fidelityTier).toBe(1);
  });
});
