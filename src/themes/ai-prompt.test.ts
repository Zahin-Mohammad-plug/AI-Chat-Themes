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
  it('includes token names, both links, rules, and image guidance', () => {
    const p = buildDesignPrompt({ theme: dark, mode: 'edit' });
    expect(p).toContain('```json');
    expect(p).toContain('text.primary');
    expect(p).toContain('appGradient');
    expect(p).toContain(STORE_REVIEW_URL);
    expect(p).toContain(SUPPORT_URL);
    expect(p).toMatch(/exactly one/i);
    expect(p).toMatch(/4\.5:1|WCAG AA/);
    expect(p.toLowerCase()).toContain('url(');
    expect(p).toMatch(/ask me 1.3 quick questions/i); // clarifying-question behaviour
    expect(p).toMatch(/background image/i); // image handling
  });

  it('ends with the "User wants the following changes:" block + the description', () => {
    const p = buildDesignPrompt({ theme: dark, mode: 'edit', description: 'make it warmer' });
    expect(p.trimEnd().endsWith('make it warmer')).toBe(true);
    expect(p).toContain('User wants the following changes:');
  });

  it('leaves the changes block open when no description is given', () => {
    const p = buildDesignPrompt({ theme: dark, mode: 'edit' });
    expect(p.trimEnd().endsWith('User wants the following changes:')).toBe(true);
  });

  it('embeds a theme JSON that round-trips through parseImportedTheme', () => {
    const p = buildDesignPrompt({ theme: dark, mode: 'create' });
    const { theme } = parseImportedTheme(firstJsonBlock(p));
    expect(theme).not.toBeNull();
    expect(theme!.tokens['bg.app']).toBe(dark.tokens['bg.app']);
  });

  it('strips an embedded background image (keeps prompt small) and notes it', () => {
    const withImg: Theme = {
      ...dark,
      material: { image: 'data:image/png;base64,AAAABBBBCCCC', scrimOpacity: 0.8 },
    };
    const p = buildDesignPrompt({ theme: withImg, mode: 'edit' });
    expect(p).not.toContain('data:image/png;base64,AAAABBBBCCCC');
    expect(p).toMatch(/already uses a \*\*custom background image/i);
  });
});
