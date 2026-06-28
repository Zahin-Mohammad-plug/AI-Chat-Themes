// Color utilities: parsing, contrast (WCAG), and hex -> "H S% L%" triples.
// These are used by both the schema (contrast validation) and the engine
// (Claude consumes design tokens as `hsl(var(--token))`, so overrides must be
// supplied as bare "H S% L%" triples).

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** Parse #rgb, #rrggbb, #rrggbbaa, rgb()/rgba() into RGB (0-255). null if unparseable. */
export function parseColor(input: string): Rgb | null {
  const s = input.trim().toLowerCase();

  const hex = s.startsWith('#') ? s.slice(1) : null;
  if (hex) {
    if (hex.length === 3) {
      const r = parseInt(hex[0]! + hex[0]!, 16);
      const g = parseInt(hex[1]! + hex[1]!, 16);
      const b = parseInt(hex[2]! + hex[2]!, 16);
      return { r, g, b };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if ([r, g, b].some(Number.isNaN)) return null;
      return { r, g, b };
    }
    return null;
  }

  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1]!.split(/[,/\s]+/).filter(Boolean);
    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }

  return null;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

/** Convert any parseable color to a bare "H S% L%" triple (Claude token format). */
export function toHslTriple(input: string): string | null {
  const rgb = parseColor(input);
  if (!rgb) return null;
  const { h, s, l } = rgbToHsl(rgb);
  return `${round(h)} ${round(s * 100)}% ${round(l * 100)}%`;
}

/**
 * Convert any parseable color to `rgba(r,g,b,alpha)`. Used to build the
 * readability scrim layered over Tier-2 material textures (PRD 6.2). Returns
 * null if the input can't be parsed (caller skips the scrim — never throws).
 */
export function toRgba(input: string, alpha: number): string | null {
  const rgb = parseColor(input);
  if (!rgb) return null;
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function channelLuminance(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

/** WCAG contrast ratio between two colors. Returns 1 if either is unparseable. */
export function contrastRatio(a: string, b: string): number {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return 1;
  const la = relativeLuminance(ca);
  const lb = relativeLuminance(cb);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export const WCAG_AA_BODY = 4.5;
