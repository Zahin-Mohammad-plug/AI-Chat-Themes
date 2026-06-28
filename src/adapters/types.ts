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
}

/**
 * How a host signals its own light/dark mode. The engine must keep this in sync
 * with the theme's base, otherwise the host's framework styles (e.g. Tailwind
 * `dark:` utilities in modals/menus) fight a mismatched theme. Hosts differ:
 * ChatGPT toggles a class, Claude toggles an attribute.
 */
export type ColorModeSpec =
  | { type: 'class'; name: string }
  | { type: 'attribute'; name: string; darkValue: string; lightValue: string };

export interface HostAdapter {
  host: HostId;
  /** Human label for the host shape (fingerprint), PRD 5.5. */
  fingerprint: string;
  tokenFormat: TokenFormat;
  /** How this host expresses its native light/dark mode (PRD 16: precedence). */
  colorMode?: ColorModeSpec;
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
  hosts: Record<HostId, HostAdapter>;
}
