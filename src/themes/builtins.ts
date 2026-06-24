// Built-in theme catalog — shipped as DATA (PRD Section 6, M1 scope).
// All themes reuse the one token-application engine; nothing here names a host
// class. Color choices follow each theme's well-known public palette; this
// extension is not affiliated with those projects and ships only color values.

import { deriveTokens } from './schema';
import { SCHEMA_VERSION, type Theme, type ThemeBase, type ThemeTokens } from './types';

interface BuiltinSpec {
  id: string;
  name: string;
  base: ThemeBase;
  /** Short blurb shown in the popup. */
  blurb: string;
  tokens: Partial<ThemeTokens>;
}

const SPECS: BuiltinSpec[] = [
  // --- Core neutrals (required by M1) ---
  {
    id: 'builtin-dark',
    name: 'Dark',
    base: 'dark',
    blurb: 'Balanced neutral dark.',
    tokens: {
      'bg.app': '#0e0e10',
      'bg.surface': '#16161a',
      'bg.elevated': '#1d1d22',
      'text.primary': '#ececec',
      'text.secondary': '#a0a0a8',
      'text.tertiary': '#6e6e78',
      accent: '#7c8cff',
      'accent.text': '#0e0e10',
      'border.hairline': 'rgba(255,255,255,0.10)',
      'composer.bg': '#16161a',
      'sidebar.bg': '#0b0b0d',
      'code.bg': '#1a1a1f',
    },
  },
  {
    id: 'builtin-light',
    name: 'Light',
    base: 'light',
    blurb: 'Clean neutral light.',
    tokens: {
      'bg.app': '#ffffff',
      'bg.surface': '#f6f6f7',
      'bg.elevated': '#ececee',
      'text.primary': '#1a1a1a',
      'text.secondary': '#52525b',
      'text.tertiary': '#8a8a93',
      accent: '#4f46e5',
      'accent.text': '#ffffff',
      'border.hairline': 'rgba(0,0,0,0.10)',
      'composer.bg': '#ffffff',
      'sidebar.bg': '#f0f0f1',
      'code.bg': '#f2f2f4',
    },
  },
  {
    id: 'builtin-amoled',
    name: 'AMOLED',
    base: 'amoled',
    blurb: 'True black for OLED screens.',
    tokens: {
      'bg.app': '#000000',
      'bg.surface': '#070707',
      'bg.elevated': '#121212',
      'text.primary': '#f2f2f2',
      'text.secondary': '#9a9a9a',
      'text.tertiary': '#5e5e5e',
      accent: '#7c8cff',
      'accent.text': '#000000',
      'border.hairline': 'rgba(255,255,255,0.08)',
      'composer.bg': '#070707',
      'sidebar.bg': '#000000',
      'code.bg': '#0a0a0a',
    },
  },

  // --- Recognizable community palettes ---
  {
    id: 'builtin-dracula',
    name: 'Dracula',
    base: 'dark',
    blurb: 'Purple-black with pink accents.',
    tokens: {
      'bg.app': '#21222c',
      'bg.surface': '#282a36',
      'bg.elevated': '#343746',
      'text.primary': '#f8f8f2',
      'text.secondary': '#bcc2cd',
      'text.tertiary': '#6272a4',
      accent: '#ff79c6',
      'accent.text': '#21222c',
      'border.hairline': 'rgba(189,147,249,0.18)',
      'composer.bg': '#282a36',
      'sidebar.bg': '#1d1e26',
      'code.bg': '#282a36',
    },
  },
  {
    id: 'builtin-one-dark-pro',
    name: 'One Dark Pro',
    base: 'dark',
    blurb: "Atom's iconic One Dark.",
    tokens: {
      'bg.app': '#21252b',
      'bg.surface': '#282c34',
      'bg.elevated': '#2c313a',
      'text.primary': '#d7dae0',
      'text.secondary': '#abb2bf',
      'text.tertiary': '#7f848e',
      accent: '#61afef',
      'accent.text': '#21252b',
      'border.hairline': 'rgba(255,255,255,0.09)',
      'composer.bg': '#282c34',
      'sidebar.bg': '#21252b',
      'code.bg': '#282c34',
    },
  },
  {
    id: 'builtin-night-owl',
    name: 'Night Owl',
    base: 'dark',
    blurb: 'Low-light, accessibility-minded.',
    tokens: {
      'bg.app': '#010e1a',
      'bg.surface': '#011627',
      'bg.elevated': '#0b2942',
      'text.primary': '#d6deeb',
      'text.secondary': '#8badc1',
      'text.tertiary': '#5f7e97',
      accent: '#82aaff',
      'accent.text': '#011627',
      'border.hairline': 'rgba(130,170,255,0.16)',
      'composer.bg': '#011627',
      'sidebar.bg': '#010e1a',
      'code.bg': '#011627',
    },
  },
  {
    id: 'builtin-synthwave-84',
    name: "Synthwave '84",
    base: 'dark',
    blurb: 'Neon retro glow.',
    tokens: {
      'bg.app': '#241b2f',
      'bg.surface': '#2a2139',
      'bg.elevated': '#34294f',
      'text.primary': '#f4eee4',
      'text.secondary': '#c4b7d8',
      'text.tertiary': '#8a7ca8',
      accent: '#ff7edb',
      'accent.text': '#241b2f',
      'border.hairline': 'rgba(255,126,219,0.22)',
      'composer.bg': '#2a2139',
      'sidebar.bg': '#1f1729',
      'code.bg': '#2a2139',
    },
  },
  {
    id: 'builtin-material',
    name: 'Material Ocean',
    base: 'dark',
    blurb: 'Material Theme oceanic.',
    tokens: {
      'bg.app': '#1e272c',
      'bg.surface': '#263238',
      'bg.elevated': '#2e3c43',
      'text.primary': '#eeffff',
      'text.secondary': '#a6accd',
      'text.tertiary': '#717cb4',
      accent: '#80cbc4',
      'accent.text': '#1e272c',
      'border.hairline': 'rgba(128,203,196,0.16)',
      'composer.bg': '#263238',
      'sidebar.bg': '#1e272c',
      'code.bg': '#263238',
    },
  },
  {
    id: 'builtin-catppuccin-mocha',
    name: 'Catppuccin Mocha',
    base: 'dark',
    blurb: 'Trendy pastel dark.',
    tokens: {
      'bg.app': '#181825',
      'bg.surface': '#1e1e2e',
      'bg.elevated': '#313244',
      'text.primary': '#cdd6f4',
      'text.secondary': '#a6adc8',
      'text.tertiary': '#7f849c',
      accent: '#cba6f7',
      'accent.text': '#181825',
      'border.hairline': 'rgba(205,214,244,0.10)',
      'composer.bg': '#1e1e2e',
      'sidebar.bg': '#11111b',
      'code.bg': '#1e1e2e',
    },
  },
  {
    id: 'builtin-github-dark',
    name: 'GitHub Dark',
    base: 'dark',
    blurb: 'Clean mainstream dark.',
    tokens: {
      'bg.app': '#010409',
      'bg.surface': '#0d1117',
      'bg.elevated': '#161b22',
      'text.primary': '#e6edf3',
      'text.secondary': '#9aa4b0',
      'text.tertiary': '#7d8590',
      accent: '#2f81f7',
      'accent.text': '#ffffff',
      'border.hairline': '#30363d',
      'composer.bg': '#0d1117',
      'sidebar.bg': '#010409',
      'code.bg': '#161b22',
    },
  },
  {
    id: 'builtin-cobalt2',
    name: 'Cobalt2',
    base: 'dark',
    blurb: 'Deep blue with yellow.',
    tokens: {
      'bg.app': '#15232d',
      'bg.surface': '#193549',
      'bg.elevated': '#1f4662',
      'text.primary': '#ffffff',
      'text.secondary': '#aac9d6',
      'text.tertiary': '#6f8fa3',
      accent: '#ffc600',
      'accent.text': '#15232d',
      'border.hairline': 'rgba(255,198,0,0.18)',
      'composer.bg': '#193549',
      'sidebar.bg': '#122631',
      'code.bg': '#193549',
    },
  },
  {
    id: 'builtin-ayu-mirage',
    name: 'Ayu Mirage',
    base: 'dark',
    blurb: 'Warm minimalist.',
    tokens: {
      'bg.app': '#1a1f29',
      'bg.surface': '#1f2430',
      'bg.elevated': '#232834',
      'text.primary': '#cccac2',
      'text.secondary': '#9a9690',
      'text.tertiary': '#707a8c',
      accent: '#ffcc66',
      'accent.text': '#1a1f29',
      'border.hairline': 'rgba(255,204,102,0.16)',
      'composer.bg': '#1f2430',
      'sidebar.bg': '#1a1f29',
      'code.bg': '#1f2430',
    },
  },
];

export const BUILTIN_THEMES: Theme[] = SPECS.map((spec) => ({
  schemaVersion: SCHEMA_VERSION,
  id: spec.id,
  name: spec.name,
  author: 'AI Chat Themes',
  appliesTo: ['chatgpt', 'claude'],
  base: spec.base,
  builtin: true,
  tokens: deriveTokens(spec.base, spec.tokens),
}));

export const BUILTIN_BLURBS: Record<string, string> = Object.fromEntries(
  SPECS.map((s) => [s.id, s.blurb]),
);

export const DEFAULT_THEME_ID = 'builtin-dark';

export function getBuiltin(id: string): Theme | undefined {
  return BUILTIN_THEMES.find((t) => t.id === id);
}
