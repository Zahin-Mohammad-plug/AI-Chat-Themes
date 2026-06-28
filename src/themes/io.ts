// Theme import/export — PRD Section 12 / EPIC D3.
// Export produces a clean, portable schema JSON. Import parses, then runs the
// SAME validation + sanitization as everything else (normalizeTheme), so a
// malformed or malicious file is rejected/sanitized — never applied raw.

import { normalizeTheme, type ValidationResult } from './schema';
import type { Theme } from './types';

/** Serialize a theme to portable JSON (drops runtime-only flags like `builtin`). */
export function exportThemeJson(theme: Theme): string {
  const portable = {
    schemaVersion: theme.schemaVersion,
    id: theme.id,
    name: theme.name,
    author: theme.author,
    appliesTo: theme.appliesTo,
    base: theme.base,
    class: theme.class,
    style: theme.style,
    fidelityTier: theme.fidelityTier,
    tokens: theme.tokens,
    typography: theme.typography,
    code: theme.code,
    layout: theme.layout,
    effects: theme.effects,
    material: theme.material,
    motion: theme.motion,
  };
  return JSON.stringify(portable, null, 2);
}

/** A filesystem-safe filename for a theme export. */
export function exportFilename(theme: Theme): string {
  const slug = theme.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'theme'}.aichattheme.json`;
}

/**
 * Parse + validate an imported theme file. Returns the normalized Theme (or null
 * on unrecoverable input) plus the validation report (warnings/errors).
 */
export function parseImportedTheme(text: string): { theme: Theme | null; result: ValidationResult } {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return { theme: null, result: { ok: false, errors: ['File is not valid JSON'], warnings: [] } };
  }
  // Mark imported themes as non-builtin so they can be edited/deleted.
  const normalized = normalizeTheme(obj);
  if (normalized.theme) normalized.theme.builtin = false;
  return normalized;
}
