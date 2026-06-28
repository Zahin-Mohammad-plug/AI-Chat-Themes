// Token application engine — PRD EPIC A3.
// Applies a theme by (1) overriding the host's CSS custom properties and
// (2) injecting a scoped <style> of semantic-anchor rules. Both layers are
// driven purely by the theme tokens + the adapter map; toggling off removes
// the injected <style> and fully restores the native host.

import type { HostAdapter } from '@/src/adapters/types';
import { resolveTexture } from '@/src/themes/assets';
import type { Theme, ThemeBase, ThemeTokens, TokenKey } from '@/src/themes/types';
import { toHslTriple, toRgba } from '@/src/util/color';

// Expressive layers (effects/material) paint the app shell behind everything.
// We target the universal roots both adapters already theme, so behavior is
// identical on both hosts and no host-specific selector is hardcoded here.
const SHELL_SELECTOR = 'html, body, main';

export const STYLE_ID = 'act-theme-style';
export const CLOAK_ID = 'act-cloak-style';

function resolveTokenValue(
  tokens: ThemeTokens,
  key: TokenKey,
  format: HostAdapter['tokenFormat'],
): string {
  const raw = tokens[key];
  if (format === 'hsl-triple') {
    const triple = toHslTriple(raw);
    // Fall back to the raw value if it can't be parsed (engine never throws).
    return triple ?? raw;
  }
  return raw;
}

/** Build the full theme stylesheet text from a theme + host adapter. */
export function buildThemeCss(theme: Theme, adapter: HostAdapter): string {
  const t = theme.tokens;
  const blocks: string[] = [];

  // (1) Tier-1: override the host's design-token custom properties.
  const varLines: string[] = [];
  for (const [cssVar, tokenKey] of Object.entries(adapter.tokenVars)) {
    if (!tokenKey) continue;
    const value = resolveTokenValue(t, tokenKey, adapter.tokenFormat);
    varLines.push(`  ${cssVar}: ${value} !important;`);
  }
  // Also publish our own namespaced vars for anchor rules / debugging.
  for (const [k, v] of Object.entries(t)) {
    varLines.push(`  --act-${k.replace(/\./g, '-')}: ${v};`);
  }
  if (varLines.length) {
    blocks.push(`:root, html, body {\n${varLines.join('\n')}\n}`);
  }

  // (2) Tier 2-3: semantic-anchor rules.
  for (const anchor of adapter.anchors) {
    const decls: string[] = [];
    for (const [prop, tokenKey] of Object.entries(anchor.style)) {
      if (!tokenKey) continue;
      decls.push(`  ${prop}: ${t[tokenKey]} !important;`);
    }
    if (decls.length) {
      blocks.push(`${anchor.selector} {\n${decls.join('\n')}\n}`);
    }
  }

  // (3) Optional, conservative typography (colors-and-type only, no layout).
  const typo = theme.typography;
  if (typo) {
    const body: string[] = [];
    if (typo.fontFamily) body.push(`  font-family: ${typo.fontFamily} !important;`);
    if (typo.lineHeight) body.push(`  line-height: ${typo.lineHeight} !important;`);
    if (body.length) blocks.push(`body {\n${body.join('\n')}\n}`);
    if (typo.codeFontFamily) {
      blocks.push(`pre, code {\n  font-family: ${typo.codeFontFamily} !important;\n}`);
    }
  }

  // (4) Expressive layers (schema v2). Always layered on top of the palette
  // floor above — if a layer is absent or its asset is unknown, the surface
  // simply renders from the palette (PRD 6.1 graceful degradation).
  blocks.push(...buildExpressiveCss(theme));

  return blocks.join('\n\n');
}

/**
 * Build the expressive (effects/material) CSS for a theme. Returns an empty
 * array for a plain palette theme. Never throws: an unparseable token or
 * unknown texture just drops that layer.
 */
function buildExpressiveCss(theme: Theme): string[] {
  const out: string[] = [];
  const t = theme.tokens;

  // App-shell background image: a scrimmed material texture (Tier 2) and/or an
  // effects gradient (Tier 1), stacked in one `background-image`.
  const layers: string[] = [];
  if (theme.material) {
    const tex = resolveTexture(theme.material.texture);
    if (tex) {
      // [INVARIANT 6.2] Mandatory readability scrim: a solid wash of the base
      // bg color over the texture so text over the app shell stays AA-readable.
      const scrim = toRgba(t['bg.app'], theme.material.scrimOpacity ?? 0.82);
      if (scrim) layers.push(`linear-gradient(${scrim}, ${scrim}), ${tex}`);
      else layers.push(tex);
    }
  }
  if (theme.effects?.appGradient) layers.push(theme.effects.appGradient);

  if (layers.length) {
    const size = theme.material?.size ?? 'cover';
    out.push(
      `${SHELL_SELECTOR} {\n` +
        `  background-image: ${layers.join(', ')} !important;\n` +
        `  background-size: ${size} !important;\n` +
        `  background-position: center !important;\n` +
        `  background-repeat: no-repeat !important;\n` +
        `  background-attachment: fixed !important;\n` +
        `}`,
    );
  }

  // Accent glow (Tier 1): a subtle text-shadow on links/accents. GPU-friendly
  // (shadow only), bounded, and conservatively scoped to avoid host breakage.
  if (theme.effects?.accentGlow) {
    out.push(`a, a * {\n  text-shadow: ${theme.effects.accentGlow} !important;\n}`);
  }

  return out;
}

function upsertStyle(id: string, css: string, doc: Document): void {
  let el = doc.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = id;
    // documentElement is available at document_start before <head> exists.
    (doc.head ?? doc.documentElement).appendChild(el);
  }
  el.textContent = css;
}

export interface ColorModeSnapshot {
  hadClass?: boolean;
  attrValue?: string | null;
  colorScheme: string;
}

/** Capture the host's native color-mode state so we can restore it on toggle-off. */
export function captureColorMode(adapter: HostAdapter, doc: Document = document): ColorModeSnapshot {
  const de = doc.documentElement;
  const snap: ColorModeSnapshot = { colorScheme: de.style.colorScheme };
  const m = adapter.colorMode;
  if (m?.type === 'class') snap.hadClass = de.classList.contains(m.name);
  else if (m?.type === 'attribute') snap.attrValue = de.getAttribute(m.name);
  return snap;
}

function setMode(el: Element, m: NonNullable<HostAdapter['colorMode']>, wantDark: boolean): void {
  if (m.type === 'class') el.classList.toggle(m.name, wantDark);
  else el.setAttribute(m.name, wantDark ? m.darkValue : m.lightValue);
}

function clearMode(el: Element, m: NonNullable<HostAdapter['colorMode']>): void {
  if (m.type === 'class') el.classList.remove(m.name);
  else el.removeAttribute(m.name);
}

/**
 * Sync the host's own light/dark mode to the theme base (PRD 16: extension theme
 * wins on themed surfaces). Without this, the host's framework styles (Tailwind
 * `dark:` utilities) fight a mismatched theme — e.g. a light theme leaves
 * ChatGPT's menus/settings dark, and a dark theme leaves Claude's design-system
 * message text black. Propagates to `scopes` (nested design-system roots) too.
 */
export function applyColorMode(
  base: ThemeBase,
  adapter: HostAdapter,
  doc: Document = document,
): void {
  const m = adapter.colorMode;
  if (!m) return;
  const wantDark = base !== 'light';
  setMode(doc.documentElement, m, wantDark);
  doc.documentElement.style.colorScheme = wantDark ? 'dark' : 'light';
  for (const sel of m.scopes ?? []) {
    doc.querySelectorAll(sel).forEach((el) => setMode(el, m, wantDark));
  }
}

/** Restore the host's native color-mode (used when theming is turned off). */
export function restoreColorMode(
  adapter: HostAdapter,
  snap: ColorModeSnapshot,
  doc: Document = document,
): void {
  const m = adapter.colorMode;
  const de = doc.documentElement;
  if (m?.type === 'class' && snap.hadClass !== undefined) de.classList.toggle(m.name, snap.hadClass);
  else if (m?.type === 'attribute' && snap.attrValue !== undefined) {
    if (snap.attrValue === null) de.removeAttribute(m.name);
    else de.setAttribute(m.name, snap.attrValue);
  }
  de.style.colorScheme = snap.colorScheme;
  // Scope markers were ours; the host manages those elements natively, so clear.
  if (m) for (const sel of m.scopes ?? []) doc.querySelectorAll(sel).forEach((el) => clearMode(el, m));
}

/**
 * Apply a theme to the document. Returns the anchor ids that were emitted,
 * for the post-apply health check (PRD 5.4).
 */
export function applyThemeToDocument(
  theme: Theme,
  adapter: HostAdapter,
  doc: Document = document,
): string[] {
  const css = buildThemeCss(theme, adapter);
  upsertStyle(STYLE_ID, css, doc);
  applyColorMode(theme.base, adapter, doc);
  doc.documentElement.setAttribute('data-act-theme', theme.id);
  return adapter.anchors.map((a) => a.id);
}

/** Remove the injected theme, fully restoring the native host. */
export function removeTheme(doc: Document = document): void {
  doc.getElementById(STYLE_ID)?.remove();
  doc.documentElement.removeAttribute('data-act-theme');
}

/**
 * Pre-paint cloak (PRD 11.1): paint the app background immediately so the
 * native theme never flashes. Background-paint only — never hides content —
 * so a failure can never leave the page blank.
 */
export function injectCloak(bgColor: string, textColor: string, doc: Document = document): void {
  upsertStyle(
    CLOAK_ID,
    `html, body { background-color: ${bgColor} !important; color: ${textColor} !important; }`,
    doc,
  );
}

export function removeCloak(doc: Document = document): void {
  doc.getElementById(CLOAK_ID)?.remove();
}
