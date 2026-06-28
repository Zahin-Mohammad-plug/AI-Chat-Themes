// Tests for generate-from-accent (PRD D4): one seed -> coherent, contrast-safe.
import { describe, expect, it } from 'vitest';
import { generateFromAccent } from './generate';
import { contrastRatio, toHex, WCAG_AA_BODY } from '@/src/util/color';
import type { ThemeBase } from './types';

const BASES: ThemeBase[] = ['dark', 'light', 'amoled'];
const SEEDS = ['#ff6600', '#3b82f6', '#10b981', '#cba6f7', '#e24b4a'];

describe('generateFromAccent', () => {
  it('produces #rrggbb tokens with the seed as accent', () => {
    const tokens = generateFromAccent('#ff6600', 'dark');
    expect(tokens.accent).toBe('#ff6600');
    expect(tokens['bg.app']).toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens['text.primary']).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('is contrast-safe (text vs surfaces >= AA) for every base and seed', () => {
    for (const base of BASES) {
      for (const seed of SEEDS) {
        const t = generateFromAccent(seed, base);
        expect(contrastRatio(t['text.primary'], t['bg.surface'])).toBeGreaterThanOrEqual(WCAG_AA_BODY);
        expect(contrastRatio(t['text.primary'], t['bg.app'])).toBeGreaterThanOrEqual(WCAG_AA_BODY);
      }
    }
  });

  it('falls back to safe defaults for an unparseable seed', () => {
    const t = generateFromAccent('not-a-color', 'dark');
    expect(toHex(t['bg.app'])).not.toBeNull();
    expect(contrastRatio(t['text.primary'], t['bg.surface'])).toBeGreaterThanOrEqual(WCAG_AA_BODY);
  });

  it('amoled grounds the app/sidebar in true black', () => {
    const t = generateFromAccent('#3b82f6', 'amoled');
    expect(t['bg.app']).toBe('#000000');
    expect(t['sidebar.bg']).toBe('#000000');
  });
});
