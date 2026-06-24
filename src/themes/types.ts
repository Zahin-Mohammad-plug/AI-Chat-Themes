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

/** A complete, validated theme. */
export interface Theme {
  schemaVersion: number;
  id: string;
  name: string;
  author?: string;
  appliesTo: HostId[];
  base: ThemeBase;
  builtin?: boolean;
  tokens: ThemeTokens;
  typography?: ThemeTypography;
  code?: CodeTheme;
  layout?: ThemeLayout;
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
  tokens?: Partial<ThemeTokens>;
  typography?: ThemeTypography;
  code?: CodeTheme;
  layout?: ThemeLayout;
  advancedCss?: string | null;
}

export const SCHEMA_VERSION = 1;

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
