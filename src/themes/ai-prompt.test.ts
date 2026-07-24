import { describe, expect, it } from 'vitest';
import { buildDesignPrompt } from './ai-prompt';
import { getBuiltin } from './builtins';
import { parseImportedTheme } from './io';
import { STORE_REVIEW_URL, SUPPORT_URL } from '@/src/config';
import type { Theme } from './types';

const dark = getBuiltin('builtin-dark') as Theme;

/** Extract the first ```json fenced block (the theme). */
function firstJsonBlock(prompt: string): string {
  const start = prompt.indexOf('```json');
  const from = start + '```json'.length;
  const end = prompt.indexOf('```', from);
  return prompt.slice(from, end).trim();
}

describe('buildDesignPrompt', () => {
  it('includes token names, both links, and the strict rules', () => {
    const p = buildDesignPrompt({ theme: dark, mode: 'refine' });
    expect(p).toContain('```json');
    expect(p).toContain('text.primary');
    expect(p).toContain('appGradient');
    expect(p).toContain(STORE_REVIEW_URL);
    expect(p).toContain(SUPPORT_URL);
    expect(p).toMatch(/exactly one/i);
    expect(p).toMatch(/4\.5:1|WCAG AA/);
    expect(p.toLowerCase()).toContain('url('); // it names url() in the prohibitions
  });

  it('embeds a theme JSON that round-trips through parseImportedTheme', () => {
    const p = buildDesignPrompt({ theme: dark, mode: 'refine' });
    const { theme } = parseImportedTheme(firstJsonBlock(p));
    expect(theme).not.toBeNull();
    expect(theme!.tokens['bg.app']).toBe(dark.tokens['bg.app']);
  });

  it('includes the brief in create mode', () => {
    const p = buildDesignPrompt({ theme: dark, mode: 'create', brief: 'a calm ocean theme' });
    expect(p).toContain('a calm ocean theme');
  });

  it('strips an embedded background image and notes it (keeps prompt small)', () => {
    const withImg: Theme = {
      ...dark,
      material: { image: 'data:image/png;base64,AAAABBBBCCCC', scrimOpacity: 0.8 },
    };
    const p = buildDesignPrompt({ theme: withImg, mode: 'refine' });
    expect(p).not.toContain('data:image/png;base64,AAAABBBBCCCC');
    expect(p).toMatch(/custom background image/i);
  });
});
