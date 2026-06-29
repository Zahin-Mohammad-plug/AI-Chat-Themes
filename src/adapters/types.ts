// Adapter map types — PRD Section 5.3 / EPIC B1.
// [INVARIANT] The map is pure DATA: it binds abstract anchors to host-specific
// selectors and host CSS custom properties. All consuming logic lives in the
// engine. This is what keeps the map remotely-updatable (CSS/JSON only) under
// MV3 while no remote *code* ever runs.

import type { HostId, TokenKey } from '@/src/themes/types';

/**
 * How a host consumes its design tokens:
 *  - 'color'      : `--token: #rrggbb`           (ChatGPT)
 *  - 'hsl-triple' : `--token: H S% L%` used via `hsl(var(--token))` (Claude)
 */
export type TokenFormat = 'color' | 'hsl-triple';

/** A semantic-anchor rule: a stable selector + token-driven declarations. */
export interface AnchorRule {
  /** Stable id used by the health check (PRD 5.4). */
  id: string;
  /** Selector — must use durable semantic/structural hooks (PRD 6.2 tiers 2-3). */
  selector: string;
  /** CSS property -> theme token key. Engine resolves + applies with !important. */
  style: Partial<Record<string, TokenKey>>;
  /**
   * On-demand surface that may not exist at page load (a code block before any
   * code is shown, a dialog/menu before it opens). The CSS still applies when it
   * mounts, but the health check must NOT treat its absence as a host-shape
   * failure — otherwise every fresh page would emit a false telemetry signal.
   */
  optional?: boolean;
}

/**
 * How a host signals its own light/dark mode. The engine must keep this in sync
 * with the theme's base, otherwise the host's framework styles (e.g. Tailwind
 * `dark:` utilities in modals/menus) fight a mismatched theme. Hosts differ:
 * ChatGPT toggles a class, Claude toggles an attribute.
 */
export type ColorModeSpec =
  | { type: 'class'; name: string; scopes?: string[] }
  | { type: 'attribute'; name: string; darkValue: string; lightValue: string; scopes?: string[] };
//
// `scopes` are extra selectors whose elements ALSO carry the mode marker. Some
// hosts nest an independent design-system scope (e.g. Claude's `.cds-root`,
// which reads `data-mode` on itself, not from <html>) — without propagating the
// mode there, message text renders in the wrong scheme (black on dark).

/**
 * Durable signals that identify a host "shape" (PRD 5.5). An adapter matches the
 * live page when all its declared signals are present. Chosen from durable hints
 * (known CSS custom properties, DOM landmarks) rather than brittle hashed
 * classes. An adapter with no signals always matches (single-shape hosts).
 */
export interface FingerprintSignals {
  /** CSS custom properties expected to be defined on :root. */
  cssVars?: string[];
  /** DOM selectors expected to resolve. */
  selectors?: string[];
}

export interface HostAdapter {
  host: HostId;
  /** Human label for the host shape (fingerprint), PRD 5.5. */
  fingerprint: string;
  tokenFormat: TokenFormat;
  /** How this host expresses its native light/dark mode (PRD 16: precedence). */
  colorMode?: ColorModeSpec;
  /** Durable signals for fingerprint-based selection (PRD 5.5). */
  signals?: FingerprintSignals;
  /**
   * True when the host's code-block SYNTAX highlighting follows the OS
   * `prefers-color-scheme` rather than the host's own light/dark attribute
   * (Claude does this). When set, the engine makes the code SURFACE follow the
   * OS scheme too, so a dark theme on a light OS (or vice-versa) can't leave
   * dark tokens on a dark code background. Readability beats theme-matched code
   * tint (PRD 5.4: degrade to readable, never to broken).
   */
  codeFollowsOsScheme?: boolean;
  /**
   * Host CSS custom property name -> theme token key. Tier-1 targeting (most
   * durable). Overriding these cascades automatically through the host.
   */
  tokenVars: Partial<Record<string, TokenKey>>;
  /** Tier 2-3 semantic anchors for surfaces tokens don't fully cover. */
  anchors: AnchorRule[];
}

export interface AdapterMap {
  version: number;
  /** Per-host disable flag (remote kill switch, PRD 5.4). */
  killSwitch?: Partial<Record<HostId, boolean>>;
  /** Per-host anchor ids to skip — surface-level kill switch (PRD 5.4). */
  disabledAnchors?: Partial<Record<HostId, string[]>>;
  /** The default adapter per host. */
  hosts: Record<HostId, HostAdapter>;
  /**
   * Optional alternate host shapes chosen by fingerprint at runtime (PRD 5.5).
   * Lets one map support several host versions during a rollout/A-B test.
   */
  variants?: Partial<Record<HostId, HostAdapter[]>>;
}
