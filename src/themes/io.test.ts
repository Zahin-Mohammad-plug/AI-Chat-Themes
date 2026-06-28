// Tests for theme import/export (PRD D3).
import { describe, expect, it } from 'vitest';
import { exportFilename, exportThemeJson, parseImportedTheme } from './io';
import { getBuiltin } from './builtins';
import type { Theme } from './types';

describe('export -> import round-trip', () => {
  it('reproduces a palette theme', () => {
    const original = getBuiltin('builtin-dracula') as Theme;
    const { theme } = parseImportedTheme(exportThemeJson(original));
    expect(theme).not.toBeNull();
    expect(theme!.name).toBe(original.name);
    expect(theme!.base).toBe(original.base);
    expect(theme!.tokens).toEqual(original.tokens);
    expect(theme!.builtin).toBe(false); // imported copies are editable
  });

  it('reproduces an expressive theme (effects + material survive)', () => {
    const original = getBuiltin('builtin-cyberpunk') as Theme;
    const { theme } = parseImportedTheme(exportThemeJson(original));
    expect(theme!.effects?.accentGlow).toBe(original.effects?.accentGlow);
    expect(theme!.material?.texture).toBe(original.material?.texture);
    expect(theme!.class).toBe('expressive');
  });

  it('builds a filesystem-safe filename', () => {
    const t = getBuiltin('builtin-midnight-oled') as Theme;
    expect(exportFilename(t)).toBe('midnight-oled.aichattheme.json');
  });
});

describe('import safety', () => {
  it('rejects non-JSON with a clear error', () => {
    const { theme, result } = parseImportedTheme('{not json');
    expect(theme).toBeNull();
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/JSON/i);
  });

  it('sanitizes a malicious import (advancedCss dropped, external-url effect stripped)', () => {
    const json = JSON.stringify({
      name: 'Evil',
      base: 'dark',
      advancedCss: 'body{background:url(https://evil.example/x)}',
      effects: { appGradient: "url('https://evil.example/leak')" },
      material: { texture: "url('http://x')", scrimOpacity: 0.1 },
    });
    const { theme } = parseImportedTheme(json);
    expect(theme).not.toBeNull();
    expect(theme!.advancedCss).toBeNull();
    expect(theme!.effects).toBeUndefined();
    expect(theme!.material).toBeUndefined();
  });
});
