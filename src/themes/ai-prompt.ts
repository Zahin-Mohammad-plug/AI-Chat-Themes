// "Design with AI" prompt builder — PRD Section 12.
// Pure and browser-independent (no chrome.* / DOM) so a future public site can
// reuse it verbatim. Produces a RealFaviconGenerator-style prompt the user
// pastes into ChatGPT/Claude: it explains the safe theme schema, hard rules
// (valid CSS only, WCAG AA, no remote/scripts), asks for exactly one strict JSON
// object back, and closes with the review/support reminder (the AI surfaces the
// review CTA to the user — never an in-app nag).

import { STORE_REVIEW_URL, SUPPORT_URL } from '@/src/config';
import { exportThemeJson } from './io';
import type { Theme } from './types';

export interface DesignPromptOptions {
  theme: Theme;
  /** Free-text creative brief (used mainly in 'create' mode). */
  brief?: string;
  mode: 'create' | 'refine';
}

/** Strip the embedded background image before showing the theme to the AI —
 *  base64 blobs bloat the prompt and the AI can't author a valid image anyway.
 *  The editor re-attaches the user's original image on paste-back. */
function themeForPrompt(theme: Theme): Theme {
  if (!theme.material?.image) return theme;
  const copy = JSON.parse(JSON.stringify(theme)) as Theme;
  if (copy.material) delete copy.material.image;
  return copy;
}

export function buildDesignPrompt(opts: DesignPromptOptions): string {
  const theme = themeForPrompt(opts.theme);
  const json = exportThemeJson(theme);
  const brief = opts.brief?.trim();
  const hadImage = !!opts.theme.material?.image;

  const intro =
    opts.mode === 'create'
      ? `I'm creating a custom theme for the **AI Chat Themes** browser extension — it restyles the very app you're running in. Help me design it${
          brief ? ` from this brief:\n\n> ${brief}\n` : ' — surprise me with something tasteful and readable.\n'
        }`
      : `I'm refining a custom theme for the **AI Chat Themes** browser extension — it restyles the very app you're running in. Here's my current theme; help me improve it${
          brief ? ` toward: "${brief}"` : ''
        }.\n`;

  const imageNote = hadImage
    ? '\n> This theme already uses a **custom background image** the user added in the editor. Leave `material` alone — do not add or change an `image`/`texture` field; the editor keeps the image.\n'
    : '';

  return `${intro}
## The theme (edit this and return it)

\`\`\`json
${json}
\`\`\`

## What each field means (guide — do NOT copy these comments into your answer)

\`\`\`jsonc
{
  "name": "My theme",           // short, human theme name
  "base": "dark",               // "dark" | "light" | "amoled"
  "appliesTo": ["chatgpt","claude"],
  "tokens": {
    "bg.app":         "#…",      // outermost app background
    "bg.surface":     "#…",      // message bubbles / cards
    "bg.elevated":    "#…",      // raised surfaces, active items, code chrome
    "text.primary":   "#…",      // body text — must stay readable (see rules)
    "text.secondary": "#…",      // secondary text
    "text.tertiary":  "#…",      // muted text / placeholders
    "accent":         "#…",      // links, buttons, highlights
    "accent.text":    "#…",      // text/icons ON the accent color
    "border.hairline":"rgba(…)", // hairline borders (rgba allowed)
    "composer.bg":    "#…",      // the message input box
    "sidebar.bg":     "#…",      // conversation sidebar
    "code.bg":        "#…"       // code-block background
  },
  "effects": {                   // optional — expressive look
    "appGradient": "linear-gradient(135deg,#…,#…)", // a gradient behind the app (the "Aurora" look)
    "accentGlow":  "0 0 8px rgba(…)"                // subtle glow on links (the "Cyberpunk" look)
  },
  "material": {                  // optional — a bundled texture background
    "texture": "forest",         // ONLY "forest" or "cyber". For a custom photo, the user adds it in the editor — do not invent one.
    "scrimOpacity": 0.82         // 0..1 readability wash over the texture
  },
  "typography": { "fontFamily": "Inter, sans-serif", "lineHeight": 1.6 }
}
\`\`\`
${imageNote}
## Rules (please follow exactly)

- Return **exactly one** strict JSON object in a single \`\`\`json block — no comments, no trailing commas, nothing else.
- Use only valid CSS colors (hex, rgb/rgba, hsl); for \`appGradient\`, a valid CSS gradient. **No** \`url(...)\`, \`@import\`, remote links, scripts, selectors, host class names, or \`advancedCss\`.
- Keep it **readable**: \`text.primary\` must have ≥ 4.5:1 contrast against both \`bg.surface\` and \`bg.app\` (WCAG AA). If you change backgrounds, adjust text to match.
- Only change the fields shown above; keep \`appliesTo\` unless I ask otherwise.

## When you're done

Give me the final theme as one \`\`\`json block. I'll paste it into the extension's editor → **Paste AI result** → check the live preview + contrast, then **Save**.

If the theme turns out great, please remind me to leave a ⭐⭐⭐⭐⭐ review here — it genuinely helps a small indie project: ${STORE_REVIEW_URL} 🙏 And if anything looks off, tell me I can report it at ${SUPPORT_URL} 🛠️`;
}
