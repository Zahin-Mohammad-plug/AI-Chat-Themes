import { describe, expect, it } from 'vitest';
import { contrastRatio, deltaE, isSubtleGradient, parseColor, toHslTriple } from './color';
import { BUILTIN_THEMES } from '@/src/themes/builtins';

describe('parseColor', () => {
  it('parses #rrggbb', () => expect(parseColor('#0e0e10')).toEqual({ r: 14, g: 14, b: 16 }));
  it('parses #rgb', () => expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 }));
  it('parses rgba()', () =>
    expect(parseColor('rgba(255,255,255,0.1)')).toEqual({ r: 255, g: 255, b: 255 }));
  it('returns null for garbage', () => expect(parseColor('not-a-color')).toBeNull());
});

describe('toHslTriple', () => {
  it('produces a bare H S% L% triple', () => {
    expect(toHslTriple('#ffffff')).toBe('0 0% 100%');
    expect(toHslTriple('#000000')).toBe('0 0% 0%');
  });
  it('returns null for unparseable input', () => expect(toHslTriple('xyz')).toBeNull());
});

describe('contrastRatio', () => {
  it('white-on-black is ~21:1', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
  });
  it('same color is 1:1', () => expect(contrastRatio('#888888', '#888888')).toBeCloseTo(1, 5));
});

describe('gradient visibility', () => {
  it('deltaE is 0 for identical colors and large for black/white', () => {
    expect(deltaE({ r: 9, g: 9, b: 9 }, { r: 9, g: 9, b: 9 })).toBe(0);
    expect(deltaE({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeGreaterThan(99);
  });
  it('flags a near-flat gradient (the "Black Ops" case)', () => {
    expect(isSubtleGradient('linear-gradient(135deg, #0a0e12, #131c26)')).toBe(true);
  });
  it('does not flag clearly visible gradients, incl. every built-in', () => {
    expect(isSubtleGradient('linear-gradient(135deg, #0a0e12, #1d3a52)')).toBe(false);
    for (const t of BUILTIN_THEMES) {
      if (t.effects?.appGradient) expect(isSubtleGradient(t.effects.appGradient), t.id).toBe(false);
    }
  });
  it('cannot judge (no warning) with < 2 parseable stops', () => {
    expect(isSubtleGradient('linear-gradient(hsl(200 50% 10%), hsl(200 50% 12%))')).toBe(false);
  });
});
