// Theme schema (token model) — Section 6 of the PRD.
// [INVARIANT] Themes are DATA, decoupled from selectors. A theme never names a
// host class. It names abstract tokens; the adapter map binds tokens to a host.

export type ThemeBase = 'dark' | 'light' | 'amoled';

export type HostId = 'chatgpt' | 'claude';

/** The canonical set of abstract color tokens a theme may define. */
export interface ThemeTokens {
  'bg.app': string;
  'bg.surface': string;
  'bg.elevated': string;
  'text.primary': string;
  'text.secondary': string;
  'text.tertiary': string;
  accent: string;
  'accent.text': string;
  'border.hairline': string;
  'composer.bg': string;
  'sidebar.bg': string;
  'code.bg': string;
}

export type TokenKey = keyof ThemeTokens;

export interface ThemeTypography {
  fontFamily?: string;
  fontScale?: number;
  lineHeight?: number;
  codeFontFamily?: string;
}

export interface CodeTheme {
  /** Named syntax palette (informational in this slice). */
  theme?: string;
  tokens?: Record<string, string>;
}

export interface ThemeLayout {
  chatMaxWidth?: string;
  wideMode?: boolean;
}

// ---------------------------------------------------------------------------
// Schema v2 — expressive themes (PRD Section 6 / 6.1 / 6.2). All three blocks
// below are OPTIONAL and additive: a theme with none of them is a plain palette
// theme and loads exactly as a v1 theme did.
// ---------------------------------------------------------------------------

/** Theme class — palette (color-only) vs expressive (adds surface treatment). */
export type ThemeClass = 'palette' | 'expressive';

/** Surface treatment style hint (informational; drives presets/labels). */
export type ThemeStyle = 'flat' | 'gradient' | 'glow' | 'textured';

/** Fidelity tier — 1 robust everywhere, 2 best-effort on stable surfaces. */
export type FidelityTier = 1 | 2;

/**
 * Tier-1 expressive effects (PRD 6.1): pure-CSS, robust on stable surfaces and
 * identical across both hosts (they ride the app-shell background, not host
 * design tokens). Always layered ON TOP of the palette floor — if a surface
 * can't take them, the palette renders cleanly (PRD 6.1 graceful degradation).
 */
export interface ThemeEffects {
  /** A CSS background value (e.g. a gradient) painted on the app shell. */
  appGradient?: string;
  /** Accent glow shadow applied to links/accents (GPU-friendly: shadow only). */
  accentGlow?: string;
}

/**
 * Tier-2 textured material (PRD 6.2). A texture image painted on non-text app
 * surfaces only, ALWAYS under a readability scrim that preserves contrast.
 * `texture` is a bundled asset id (resolved to an inline SVG data URI — no
 * remote fetch, MV3-safe) or, later, an allowlisted https URL.
 */
export interface ThemeMaterial {
  texture: string;
  /** Surfaces the texture paints. Defaults to ['bg.app']. Never behind body text without scrim. */
  appliesToSurfaces?: TokenKey[];
  /** Mandatory readability scrim: opacity (0..1) of the base bg color over the texture. */
  scrimOpacity: number;
  /** CSS background-size for the texture (default 'cover'). */
  size?: string;
}

/**
 * Optional motion (PRD 6.2 / 11.3). Defined for forward-compatibility; the
 * engine requires `reducedMotionFallback` whenever motion is set. (No built-in
 * ships motion yet — see devlog.)
 */
export interface ThemeMotion {
  preset: 'ambientGlow' | 'shimmer' | 'sparkle' | 'none';
  intensity?: 'subtle' | 'medium';
  /** REQUIRED: static look applied under prefers-reduced-motion. */
  reducedMotionFallback: string;
}

/** A complete, validated theme. */
export interface Theme {
  schemaVersion: number;
  id: string;
  name: string;
  author?: string;
  appliesTo: HostId[];
  base: ThemeBase;
  builtin?: boolean;
  /** Defaults to 'palette' for v1 themes. */
  class?: ThemeClass;
  style?: ThemeStyle;
  /** Defaults to 1. */
  fidelityTier?: FidelityTier;
  tokens: ThemeTokens;
  typography?: ThemeTypography;
  code?: CodeTheme;
  layout?: ThemeLayout;
  effects?: ThemeEffects;
  material?: ThemeMaterial;
  motion?: ThemeMotion;
  /** Power-user raw CSS. Out of scope for this slice; always null/ignored. */
  advancedCss?: string | null;
}

/** A theme as it may arrive from import — tokens may be partial. */
export interface PartialTheme {
  schemaVersion?: number;
  id?: string;
  name?: string;
  author?: string;
  appliesTo?: HostId[];
  base?: ThemeBase;
  class?: ThemeClass;
  style?: ThemeStyle;
  fidelityTier?: FidelityTier;
  tokens?: Partial<ThemeTokens>;
  typography?: ThemeTypography;
  code?: CodeTheme;
  layout?: ThemeLayout;
  effects?: ThemeEffects;
  material?: ThemeMaterial;
  motion?: ThemeMotion;
  advancedCss?: string | null;
}

// v2 adds the optional effects/material/motion blocks. v1 themes still load:
// normalizeTheme defaults class:'palette', style:'flat', fidelityTier:1.
export const SCHEMA_VERSION = 2;

export const TOKEN_KEYS: TokenKey[] = [
  'bg.app',
  'bg.surface',
  'bg.elevated',
  'text.primary',
  'text.secondary',
  'text.tertiary',
  'accent',
  'accent.text',
  'border.hairline',
  'composer.bg',
  'sidebar.bg',
  'code.bg',
];
