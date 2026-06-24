import { describe, expect, it } from 'vitest';
import { contrastRatio, parseColor, toHslTriple } from './color';

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
