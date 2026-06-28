// Generate-from-accent helper — PRD Section 12 / EPIC D4.
// Derives a complete, coherent, contrast-safe token set from a single seed
// accent color + a base. Non-designers get a usable theme from one color.
//
// All outputs are #rrggbb so both host token paths work (ChatGPT consumes the
// color directly; Claude's hsl-triple path re-parses it). Surfaces are tinted
// toward the accent hue at low saturation for cohesion; text stays high-contrast.

import { hslToRgb, parseColor, relativeLuminance, rgbToHex, rgbToHsl } from '@/src/util/color';
import { BASE_DEFAULTS } from './schema';
import type { ThemeBase, ThemeTokens } from './types';

const hex = (h: number, s: number, l: number): string => rgbToHex(hslToRgb({ h, s, l }));

/**
 * Build a full token set from a seed accent + base. The seed sets the accent and
 * the hue that lightly tints every surface; lightness comes from the base so
 * contrast stays safe.
 */
export function generateFromAccent(seed: string, base: ThemeBase): ThemeTokens {
  const rgb = parseColor(seed);
  if (!rgb) return { ...BASE_DEFAULTS[base] }; // unparseable seed -> safe defaults
  const accentHex = rgbToHex(rgb);
  const { h } = rgbToHsl(rgb);
  const accentText = relativeLuminance(rgb) > 0.5 ? '#0b0b0b' : '#ffffff';

  if (base === 'light') {
    return {
      'bg.app': hex(h, 0.4, 0.975),
      'bg.surface': hex(h, 0.3, 0.995),
      'bg.elevated': hex(h, 0.32, 0.945),
      'text.primary': hex(h, 0.22, 0.12),
      'text.secondary': hex(h, 0.16, 0.34),
      'text.tertiary': hex(h, 0.12, 0.52),
      accent: accentHex,
      'accent.text': accentText,
      'border.hairline': 'rgba(20,20,30,0.12)',
      'composer.bg': hex(h, 0.3, 0.995),
      'sidebar.bg': hex(h, 0.34, 0.955),
      'code.bg': hex(h, 0.3, 0.955),
    };
  }

  // dark + amoled share the tinted-dark recipe; amoled drops the floor to black.
  const appL = base === 'amoled' ? 0.02 : 0.07;
  const sideL = base === 'amoled' ? 0.0 : 0.05;
  return {
    'bg.app': base === 'amoled' ? '#000000' : hex(h, 0.18, appL),
    'bg.surface': hex(h, 0.16, base === 'amoled' ? 0.05 : 0.11),
    'bg.elevated': hex(h, 0.15, base === 'amoled' ? 0.09 : 0.16),
    'text.primary': hex(h, 0.14, 0.93),
    'text.secondary': hex(h, 0.12, 0.66),
    'text.tertiary': hex(h, 0.1, 0.46),
    accent: accentHex,
    'accent.text': accentText,
    'border.hairline': 'rgba(255,255,255,0.10)',
    'composer.bg': hex(h, 0.16, base === 'amoled' ? 0.05 : 0.11),
    'sidebar.bg': base === 'amoled' ? '#000000' : hex(h, 0.2, sideL),
    'code.bg': hex(h, 0.17, base === 'amoled' ? 0.07 : 0.13),
  };
}
