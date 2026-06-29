// Bundled fallback adapter map — PRD Section 5.3.
// Ships in the package so the extension works offline and on day one of a host
// change. A remote, integrity-checked map (M3) may supersede this at runtime,
// but this snapshot is always the safe fallback.

import type { HostId } from '@/src/themes/types';
import type { AdapterMap, HostAdapter } from './types';

const chatgpt: HostAdapter = {
  host: 'chatgpt',
  fingerprint: 'chatgpt-2024-tokens',
  tokenFormat: 'color',
  // Durable signal: ChatGPT defines this design-token var on :root.
  signals: { cssVars: ['--main-surface-primary'] },
  // ChatGPT toggles a `dark` class on <html>; its Tailwind `dark:` utilities
  // (modals, menus, settings) follow it, so we must match it to the theme base.
  colorMode: { type: 'class', name: 'dark' },
  // Tier 1: ChatGPT exposes plain-color CSS custom properties.
  tokenVars: {
    '--bg-primary': 'bg.app',
    '--bg-secondary': 'bg.surface',
    '--bg-tertiary': 'bg.elevated',
    '--main-surface-primary': 'bg.surface',
    '--main-surface-secondary': 'bg.elevated',
    '--main-surface-tertiary': 'bg.elevated',
    '--message-surface': 'bg.surface',
    '--composer-surface': 'composer.bg',
    '--sidebar-surface-primary': 'sidebar.bg',
    '--sidebar-surface-secondary': 'bg.surface',
    '--sidebar-surface-tertiary': 'bg.elevated',
    '--surface-primary': 'bg.surface',
    '--surface-secondary': 'bg.elevated',
    '--text-primary': 'text.primary',
    '--text-secondary': 'text.secondary',
    '--text-tertiary': 'text.tertiary',
    '--text-quaternary': 'text.tertiary',
    '--border-light': 'border.hairline',
    '--border-medium': 'border.hairline',
    '--border-heavy': 'border.hairline',
    '--border-default': 'border.hairline',
    '--link': 'accent',
    '--link-hover': 'accent',
  },
  // Tier 2-3: semantic anchors covering surfaces the tokens may miss.
  anchors: [
    {
      id: 'app.shell',
      selector: 'html, body',
      style: { 'background-color': 'bg.app', color: 'text.primary' },
    },
    { id: 'app.main', selector: 'main', style: { 'background-color': 'bg.app' } },
    {
      // ChatGPT's sticky top bar hardcodes a near-black bg; it blends into dark
      // themes but stands out under light themes, so map it explicitly.
      id: 'app.header',
      selector: 'header',
      style: { 'background-color': 'bg.app', color: 'text.primary' },
    },
    { id: 'app.sidebar', selector: 'nav', style: { 'background-color': 'sidebar.bg' } },
    {
      // Absent on non-chat routes (settings, shared links) — optional.
      id: 'composer.input',
      selector: '#prompt-textarea',
      style: { color: 'text.primary' },
      optional: true,
    },
    {
      // Only present once a code block is shown — optional.
      id: 'codeblock.body',
      selector: 'pre',
      style: { 'background-color': 'code.bg', color: 'text.primary' },
      optional: true,
    },
    {
      // Settings, account, share, and confirm dialogs (ARIA, durable) — optional.
      id: 'overlay.dialog',
      selector: '[role="dialog"]',
      style: { 'background-color': 'bg.surface', color: 'text.primary' },
      optional: true,
    },
    {
      // Dropdown menus / model & profile pickers (ARIA, durable) — optional.
      id: 'overlay.menu',
      selector: '[role="menu"], [role="listbox"]',
      style: { 'background-color': 'bg.elevated', color: 'text.primary' },
      optional: true,
    },
  ],
};

const claude: HostAdapter = {
  host: 'claude',
  fingerprint: 'claude-2024-hsl',
  tokenFormat: 'hsl-triple',
  // Durable signal: Claude defines this base background token on :root.
  signals: { cssVars: ['--bg-000'] },
  // Claude's code syntax highlighting follows the OS prefers-color-scheme, not
  // its own data-mode — so the code surface must follow the OS scheme too.
  codeFollowsOsScheme: true,
  // Claude expresses mode via a `data-mode` attribute on <html>. Its newer
  // design-system layer (`.cds-root`, which wraps message content) reads
  // `data-mode` on the element itself, so we propagate the mode there too —
  // otherwise response text renders light-mode (black) on a dark theme.
  colorMode: {
    type: 'attribute',
    name: 'data-mode',
    darkValue: 'dark',
    lightValue: 'light',
    scopes: ['.cds-root'],
  },
  // Tier 1: Claude consumes design tokens as `hsl(var(--token))`, so the engine
  // emits bare "H S% L%" triples for these (see TokenFormat).
  tokenVars: {
    '--bg-000': 'bg.app',
    '--bg-100': 'bg.surface',
    '--bg-200': 'bg.elevated',
    '--bg-300': 'bg.elevated',
    '--bg-400': 'bg.elevated',
    '--bg-500': 'bg.elevated',
    '--text-000': 'text.primary',
    '--text-100': 'text.primary',
    '--text-200': 'text.secondary',
    '--text-300': 'text.secondary',
    '--text-400': 'text.tertiary',
    '--text-500': 'text.tertiary',
    '--border-100': 'border.hairline',
    '--border-200': 'border.hairline',
    '--border-300': 'border.hairline',
    '--accent-main-000': 'accent',
    '--accent-main-100': 'accent',
    '--accent-main-200': 'accent',
    '--accent-secondary-000': 'accent',
    '--accent-secondary-100': 'accent',
  },
  anchors: [
    {
      id: 'app.shell',
      selector: 'html, body',
      style: { 'background-color': 'bg.app', color: 'text.primary' },
    },
    { id: 'app.main', selector: 'main', style: { 'background-color': 'bg.app' } },
    {
      id: 'app.header',
      selector: 'header',
      style: { 'background-color': 'bg.app', color: 'text.primary' },
    },
    {
      // Only present once a code block is shown — optional.
      id: 'codeblock.body',
      selector: 'pre',
      style: { 'background-color': 'code.bg', color: 'text.primary' },
      optional: true,
    },
    {
      // Settings, account, and confirm dialogs (ARIA, durable) — optional.
      id: 'overlay.dialog',
      selector: '[role="dialog"]',
      style: { 'background-color': 'bg.surface', color: 'text.primary' },
      optional: true,
    },
    {
      // Dropdown menus / model & profile pickers (ARIA, durable) — optional.
      id: 'overlay.menu',
      selector: '[role="menu"], [role="listbox"]',
      style: { 'background-color': 'bg.elevated', color: 'text.primary' },
      optional: true,
    },
  ],
};

export const BUNDLED_ADAPTER_MAP: AdapterMap = {
  version: 1,
  killSwitch: {},
  hosts: { chatgpt, claude },
};

export function hostFromUrl(url: string | undefined): HostId | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    if (host === 'chatgpt.com' || host.endsWith('.chatgpt.com')) return 'chatgpt';
    if (host === 'claude.ai' || host.endsWith('.claude.ai')) return 'claude';
  } catch {
    /* not a parseable URL */
  }
  return null;
}
