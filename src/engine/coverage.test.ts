// Production-readiness matrix: every built-in theme x both hosts must produce
// valid, complete CSS across surfaces, in light AND dark/amoled bases, with no
// undefined/NaN leakage. This is the regression net for "does theming hold up
// everywhere" (PRD Section 7 surfaces + 7.1 viewports are CSS-only here).
import { describe, expect, it } from 'vitest';
import { buildThemeCss } from './apply';
import { BUNDLED_ADAPTER_MAP } from '@/src/adapters/map';
import { BUILTIN_THEMES } from '@/src/themes/builtins';
import { generateFromAccent } from '@/src/themes/generate';
import { deriveTokens } from '@/src/themes/schema';
import { SCHEMA_VERSION, type Theme, type ThemeBase } from '@/src/themes/types';

const HOSTS = ['chatgpt', 'claude'] as const;
const TRIPLE = /^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/;

describe('theme x host CSS matrix', () => {
  for (const theme of BUILTIN_THEMES) {
    for (const host of HOSTS) {
      const adapter = BUNDLED_ADAPTER_MAP.hosts[host];
      const css = buildThemeCss(theme, adapter);

      it(`${theme.id} on ${host}: valid, complete, no undefined/NaN`, () => {
        expect(css.length).toBeGreaterThan(100);
        expect(css).not.toMatch(/undefined|NaN/);
        // App shell, code surface, and themed selection are always emitted.
        expect(css).toContain('html, body');
        expect(css).toContain('::selection');
        expect(css).toContain(theme.tokens['code.bg']); // code block surface (raw)
      });

      if (host === 'claude') {
        it(`${theme.id} on claude: every host token var is a bare HSL triple`, () => {
          const rootBlock = css.slice(css.indexOf(':root'), css.indexOf('}'));
          const lines = rootBlock.match(/^ {2}--[\w-]+: [^;]+ !important;$/gm) ?? [];
          expect(lines.length).toBeGreaterThan(0);
          for (const line of lines) {
            const value = line.replace(/^ {2}--[\w-]+: /, '').replace(/ !important;$/, '');
            expect(value, line).toMatch(TRIPLE);
          }
        });
      }
    }
  }
});

describe('surface anchors are present in generated CSS (ChatGPT)', () => {
  const css = buildThemeCss(BUILTIN_THEMES[0]!, BUNDLED_ADAPTER_MAP.hosts.chatgpt);
  for (const sel of ['html, body', 'header', 'nav', 'pre', '[role="dialog"]']) {
    it(`emits a rule for ${sel}`, () => expect(css).toContain(`${sel} {`));
  }
});

describe('light AND dark/amoled bases all render cleanly', () => {
  const bases: ThemeBase[] = ['dark', 'light', 'amoled'];
  for (const base of bases) {
    for (const host of HOSTS) {
      it(`generated ${base} theme on ${host} has no undefined/NaN`, () => {
        const theme: Theme = {
          schemaVersion: SCHEMA_VERSION,
          id: `gen-${base}`,
          name: base,
          appliesTo: ['chatgpt', 'claude'],
          base,
          tokens: deriveTokens(base, generateFromAccent('#22c55e', base)),
        };
        const css = buildThemeCss(theme, BUNDLED_ADAPTER_MAP.hosts[host]);
        expect(css).not.toMatch(/undefined|NaN/);
        expect(css).toContain('::selection');
      });
    }
  }
});
