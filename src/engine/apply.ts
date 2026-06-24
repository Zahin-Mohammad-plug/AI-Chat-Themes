// Token application engine — PRD EPIC A3.
// Applies a theme by (1) overriding the host's CSS custom properties and
// (2) injecting a scoped <style> of semantic-anchor rules. Both layers are
// driven purely by the theme tokens + the adapter map; toggling off removes
// the injected <style> and fully restores the native host.

import type { HostAdapter } from '@/src/adapters/types';
import type { Theme, ThemeTokens, TokenKey } from '@/src/themes/types';
import { toHslTriple } from '@/src/util/color';

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

  return blocks.join('\n\n');
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
