// Theme schema validation + base-aware fallback derivation — PRD Section 6.
// [INVARIANT] Every token has a base-aware fallback so partial themes never
// produce unreadable contrast.

import { contrastRatio, WCAG_AA_BODY } from '@/src/util/color';
import {
  SCHEMA_VERSION,
  TOKEN_KEYS,
  type FidelityTier,
  type HostId,
  type PartialTheme,
  type Theme,
  type ThemeBase,
  type ThemeClass,
  type ThemeEffects,
  type ThemeMaterial,
  type ThemeMotion,
  type ThemeTokens,
} from './types';

const HOSTS: HostId[] = ['chatgpt', 'claude'];
const BASES: ThemeBase[] = ['dark', 'light', 'amoled'];

/** Safe default token sets per base. Used to fill any omitted token. */
export const BASE_DEFAULTS: Record<ThemeBase, ThemeTokens> = {
  dark: {
    'bg.app': '#0e0e10',
    'bg.surface': '#16161a',
    'bg.elevated': '#1d1d22',
    'text.primary': '#ececec',
    'text.secondary': '#a0a0a8',
    'text.tertiary': '#6e6e78',
    accent: '#7c8cff',
    'accent.text': '#ffffff',
    'border.hairline': 'rgba(255,255,255,0.10)',
    'composer.bg': '#16161a',
    'sidebar.bg': '#0b0b0d',
    'code.bg': '#1a1a1f',
  },
  light: {
    'bg.app': '#ffffff',
    'bg.surface': '#f6f6f7',
    'bg.elevated': '#ececee',
    'text.primary': '#1a1a1a',
    'text.secondary': '#52525b',
    'text.tertiary': '#8a8a93',
    accent: '#4f46e5',
    'accent.text': '#ffffff',
    'border.hairline': 'rgba(0,0,0,0.10)',
    'composer.bg': '#f6f6f7',
    'sidebar.bg': '#f0f0f1',
    'code.bg': '#f2f2f4',
  },
  amoled: {
    'bg.app': '#000000',
    'bg.surface': '#0a0a0a',
    'bg.elevated': '#141414',
    'text.primary': '#f2f2f2',
    'text.secondary': '#9a9a9a',
    'text.tertiary': '#5e5e5e',
    accent: '#7c8cff',
    'accent.text': '#ffffff',
    'border.hairline': 'rgba(255,255,255,0.08)',
    'composer.bg': '#0a0a0a',
    'sidebar.bg': '#000000',
    'code.bg': '#0d0d0d',
  },
};

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Fill any omitted tokens with base-aware defaults. The result is always a
 * complete, renderable token set — partial themes are made whole here.
 */
export function deriveTokens(base: ThemeBase, partial?: Partial<ThemeTokens>): ThemeTokens {
  const defaults = BASE_DEFAULTS[base];
  const out = { ...defaults } as ThemeTokens;
  if (partial) {
    for (const key of TOKEN_KEYS) {
      const v = partial[key];
      if (typeof v === 'string' && v.trim()) out[key] = v.trim();
    }
  }
  return out;
}

/**
 * Validate + normalize an untrusted theme object into a complete Theme.
 * Returns the normalized theme plus a validation report. On hard failure
 * (unrecoverable structure) `theme` is null.
 */
export function normalizeTheme(input: unknown): {
  theme: Theme | null;
  result: ValidationResult;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof input !== 'object' || input === null) {
    return { theme: null, result: { ok: false, errors: ['Theme must be an object'], warnings } };
  }
  const p = input as PartialTheme;

  // schemaVersion
  if (p.schemaVersion != null && p.schemaVersion !== SCHEMA_VERSION) {
    warnings.push(
      `Theme schemaVersion ${p.schemaVersion} != ${SCHEMA_VERSION}; attempting best-effort load`,
    );
  }

  const base: ThemeBase = BASES.includes(p.base as ThemeBase) ? (p.base as ThemeBase) : 'dark';
  if (p.base && !BASES.includes(p.base)) {
    warnings.push(`Unknown base "${p.base}"; defaulting to dark`);
  }

  const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : 'Untitled theme';

  let appliesTo: HostId[] = Array.isArray(p.appliesTo)
    ? p.appliesTo.filter((h): h is HostId => HOSTS.includes(h as HostId))
    : [];
  if (appliesTo.length === 0) appliesTo = [...HOSTS];

  // [INVARIANT] No raw CSS execution path in this slice. Reject advancedCss.
  if (p.advancedCss != null && String(p.advancedCss).trim() !== '') {
    warnings.push('advancedCss is not supported in this version and was dropped');
  }

  const tokens = deriveTokens(base, p.tokens);

  const effects = sanitizeEffects(p.effects);
  const material = sanitizeMaterial(p.material);
  const motion = sanitizeMotion(p.motion, warnings);
  // Schema v2 class: expressive if any treatment is present; else palette.
  const themeClass: ThemeClass =
    p.class === 'expressive' || effects || material || motion ? 'expressive' : 'palette';
  const fidelityTier: FidelityTier = p.fidelityTier === 2 ? 2 : 1;

  const theme: Theme = {
    schemaVersion: SCHEMA_VERSION,
    id: typeof p.id === 'string' && p.id ? p.id : cryptoRandomId(),
    name,
    author: typeof p.author === 'string' ? p.author : undefined,
    appliesTo,
    base,
    builtin: false,
    class: themeClass,
    fidelityTier,
    tokens,
    typography: sanitizeTypography(p.typography),
    code: p.code && typeof p.code === 'object' ? p.code : undefined,
    layout: sanitizeLayout(p.layout),
    effects,
    material,
    motion,
    advancedCss: null,
  };

  // Contrast safety (warn-only for imported/custom themes).
  const c1 = contrastRatio(tokens['text.primary'], tokens['bg.surface']);
  const c2 = contrastRatio(tokens['text.primary'], tokens['bg.app']);
  if (c1 < WCAG_AA_BODY || c2 < WCAG_AA_BODY) {
    warnings.push(
      `Body text contrast below WCAG AA (surface ${c1.toFixed(2)}:1, app ${c2.toFixed(2)}:1)`,
    );
  }

  return { theme, result: { ok: errors.length === 0, errors, warnings } };
}

/** Strict gate for built-in themes: must pass WCAG AA on body text. */
export function assertBuiltinContrast(theme: Theme): void {
  const c1 = contrastRatio(theme.tokens['text.primary'], theme.tokens['bg.surface']);
  const c2 = contrastRatio(theme.tokens['text.primary'], theme.tokens['bg.app']);
  if (c1 < WCAG_AA_BODY || c2 < WCAG_AA_BODY) {
    throw new Error(
      `Built-in theme "${theme.name}" fails WCAG AA body contrast ` +
        `(surface ${c1.toFixed(2)}:1, app ${c2.toFixed(2)}:1)`,
    );
  }
}

function sanitizeTypography(t: PartialTheme['typography']) {
  if (!t || typeof t !== 'object') return undefined;
  const out: NonNullable<PartialTheme['typography']> = {};
  if (typeof t.fontFamily === 'string') out.fontFamily = t.fontFamily;
  if (typeof t.codeFontFamily === 'string') out.codeFontFamily = t.codeFontFamily;
  if (typeof t.fontScale === 'number' && t.fontScale >= 0.8 && t.fontScale <= 1.4)
    out.fontScale = t.fontScale;
  if (typeof t.lineHeight === 'number' && t.lineHeight >= 1 && t.lineHeight <= 2.2)
    out.lineHeight = t.lineHeight;
  return Object.keys(out).length ? out : undefined;
}

function sanitizeLayout(l: PartialTheme['layout']) {
  if (!l || typeof l !== 'object') return undefined;
  const out: NonNullable<PartialTheme['layout']> = {};
  if (typeof l.chatMaxWidth === 'string') out.chatMaxWidth = l.chatMaxWidth;
  if (typeof l.wideMode === 'boolean') out.wideMode = l.wideMode;
  return Object.keys(out).length ? out : undefined;
}

// [INVARIANT 6.2 / 13.3] A CSS value coming from an untrusted theme must not be
// able to fetch an external resource or inject behavior. Block external url(),
// @import, expression() and javascript: regardless of casing/spacing.
function isUnsafeCss(v: string): boolean {
  const s = v.toLowerCase().replace(/\s+/g, '');
  return s.includes('url(') || s.includes('@import') || s.includes('expression(') || s.includes('javascript:');
}

function sanitizeEffects(e: PartialTheme['effects']): ThemeEffects | undefined {
  if (!e || typeof e !== 'object') return undefined;
  const out: ThemeEffects = {};
  if (typeof e.appGradient === 'string' && e.appGradient.trim() && !isUnsafeCss(e.appGradient))
    out.appGradient = e.appGradient.trim();
  if (typeof e.accentGlow === 'string' && e.accentGlow.trim() && !isUnsafeCss(e.accentGlow))
    out.accentGlow = e.accentGlow.trim();
  return Object.keys(out).length ? out : undefined;
}

function sanitizeMaterial(m: PartialTheme['material']): ThemeMaterial | undefined {
  if (!m || typeof m !== 'object') return undefined;
  // Only a bundled asset id is accepted here (plain token, no url/scheme).
  // Allowlisted https CDN textures are a later store-phase concern (PRD 13.3).
  if (typeof m.texture !== 'string' || !/^[a-z0-9_-]+$/i.test(m.texture)) return undefined;
  const scrim =
    typeof m.scrimOpacity === 'number' && m.scrimOpacity >= 0 && m.scrimOpacity <= 1
      ? Math.max(0.5, m.scrimOpacity) // never let the scrim drop below a readable floor
      : 0.82;
  const out: ThemeMaterial = { texture: m.texture, scrimOpacity: scrim };
  if (Array.isArray(m.appliesToSurfaces)) {
    const surfaces = m.appliesToSurfaces.filter((k) => TOKEN_KEYS.includes(k));
    if (surfaces.length) out.appliesToSurfaces = surfaces;
  }
  if (typeof m.size === 'string' && !isUnsafeCss(m.size)) out.size = m.size;
  return out;
}

function sanitizeMotion(
  mo: PartialTheme['motion'],
  warnings: string[],
): ThemeMotion | undefined {
  if (!mo || typeof mo !== 'object') return undefined;
  const presets = ['ambientGlow', 'shimmer', 'sparkle', 'none'] as const;
  if (!presets.includes(mo.preset as (typeof presets)[number])) return undefined;
  // [INVARIANT 11.3] Motion without a reduced-motion fallback does not ship.
  if (typeof mo.reducedMotionFallback !== 'string' || !mo.reducedMotionFallback.trim()) {
    warnings.push('motion dropped: missing required reducedMotionFallback');
    return undefined;
  }
  const out: ThemeMotion = {
    preset: mo.preset as ThemeMotion['preset'],
    reducedMotionFallback: mo.reducedMotionFallback.trim(),
  };
  if (mo.intensity === 'subtle' || mo.intensity === 'medium') out.intensity = mo.intensity;
  return out;
}

function cryptoRandomId(): string {
  // crypto.randomUUID is available in extension contexts; fall back if not.
  try {
    return (globalThis.crypto as Crypto).randomUUID();
  } catch {
    return 'theme-' + Math.abs(hashString(JSON.stringify(Date))).toString(36);
  }
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
