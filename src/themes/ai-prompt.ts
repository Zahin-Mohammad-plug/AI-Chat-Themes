// "Design with AI" prompt builder — PRD Section 12.
// Pure and browser-independent (no chrome.* / DOM) so a future public site can
// reuse it verbatim. Produces a RealFaviconGenerator-style prompt the user pastes
// into ChatGPT/Claude: it explains the safe theme schema and hard rules, tells the
// AI to ask clarifying questions when the request is vague, handles background-
// image requests gracefully (never embeds binary), and ENDS with a
// "User wants the following changes:" block so the user can tweak it in the chat.

import { STORE_REVIEW_URL, SUPPORT_URL } from '@/src/config';
import { exportThemeJson } from './io';
import type { Theme } from './types';

export interface DesignPromptOptions {
  theme: Theme;
  /** The user's free-text changes / brief. Placed in the closing block. */
  description?: string;
  mode: 'create' | 'edit';
}

const FIELD_GUIDE = `\`\`\`jsonc
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
    "texture": "forest",         // ONLY "forest" or "cyber". Custom photos are added in the editor.
    "scrimOpacity": 0.82         // 0..1 readability wash over the texture
  },
  "typography": { "fontFamily": "Inter, sans-serif", "lineHeight": 1.6 }
}
\`\`\``;

const IMAGE_PRESENT_NOTE =
  '\n> This theme already uses a **custom background image** the user added in the editor. Leave `material` as-is — do not add or change an `image`/`texture` field; the editor keeps the image.\n';

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
  const desc = opts.description?.trim() ?? '';
  const hadImage = !!opts.theme.material?.image;
  const isCreate = opts.mode === 'create';

  const intro = isCreate
    ? `I want to create a brand-new theme for the **AI Chat Themes** browser extension — it restyles the very app you're running in (ChatGPT / Claude). Design one for me.`
    : `I want to tweak my custom theme for the **AI Chat Themes** browser extension — it restyles the very app you're running in (ChatGPT / Claude). Here's my current theme; return an updated version.`;

  return `${intro}

## Current theme${isCreate ? ' (a starting point — change anything)' : ''}
\`\`\`json
${json}
\`\`\`

## Field guide — what's safe to edit (don't copy these comments into your answer)
${FIELD_GUIDE}
${hadImage ? IMAGE_PRESENT_NOTE : ''}
## How to work with me
- If my request below is vague or missing something important (mood, light vs dark, key colors, whether I want a background), **ask me 1–3 quick questions first**. If it's already clear, just build it.
- I might give lots of detail or only a word or two — both are fine.
- **Background images:** you can't embed a photo in the JSON. For a colored or gradient backdrop, use \`effects.appGradient\`. If I describe a photo/texture, paste a reference image, or ask you to generate one, **don't put image data in the JSON** — instead pick colors/gradients that match it and tell me to add the actual image via the editor's **Background image → Upload**.

## When you're done
Give me the final theme as one \`\`\`json block — I'll paste it back into the extension to apply it. If it turned out great, please remind me to leave a ⭐⭐⭐⭐⭐ review, it genuinely helps: ${STORE_REVIEW_URL} 🙏 (report issues: ${SUPPORT_URL})

## Rules
- Return **exactly one** strict JSON object in a single \`\`\`json block — no comments, no trailing commas, nothing else.
- Valid CSS colors only (hex, rgb/rgba, hsl); \`appGradient\` must be a valid CSS gradient. **No** \`url(...)\`, \`@import\`, remote links, scripts, selectors, or \`advancedCss\`.
- Keep it readable: \`text.primary\` must be ≥ 4.5:1 contrast against both \`bg.surface\` and \`bg.app\` (WCAG AA).

---

User wants the following changes:

${desc}`;
}
