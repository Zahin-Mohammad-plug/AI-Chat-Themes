# AI Chat Themes: Custom Themes & Dark Mode for ChatGPT and Claude

A Chrome (MV3) extension that applies resilient, **token-first** themes — dark,
light, AMOLED, and a dozen recognizable palettes — to **ChatGPT** (`chatgpt.com`)
and **Claude.ai** (`claude.ai`), with per-host control and no flash on load.

> Not affiliated with OpenAI or Anthropic. Appearance only — no changes to host
> behavior, no collection of prompts, responses, or page content.

This is the **M0 + M1 vertical slice**. See [docs/PRD.md](docs/PRD.md) for the
full product vision and [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) for what's built.

## Why it's different

Most theme extensions break the moment the host ships a UI update, because they
target hashed CSS classes. This one is built around the durability lever instead:
it **overrides each host's own CSS custom properties (design tokens)** first, and
falls back to **stable semantic anchors** (`main`, `nav`, ARIA/`id` hooks) only
where needed. Themes are pure **data** that never name a host class, so one theme
works on both apps and survives most host changes. (Full resilience pipeline —
remote adapter map, fingerprinting, self-healing telemetry — is M3.)

## Built-in themes

Dark · Light · AMOLED · Dracula · One Dark Pro · Night Owl · Synthwave '84 ·
Material Ocean · Catppuccin Mocha · GitHub Dark · Cobalt2 · Ayu Mirage

All built-ins are verified to meet **WCAG AA** body-text contrast.

## Develop

Requires Node 20+ and pnpm.

```bash
pnpm install        # installs deps + runs `wxt prepare`
pnpm dev            # HMR dev build (Chrome); `pnpm dev:firefox` for Firefox
pnpm build          # production build -> .output/chrome-mv3
pnpm test           # unit tests (Vitest)
pnpm compile        # type-check (tsc --noEmit)
pnpm lint           # ESLint
pnpm format         # Prettier
```

Icons are generated placeholders: `node scripts/generate-icons.mjs`.

## Load the extension

1. `pnpm build`
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select `.output/chrome-mv3`.
4. Visit `chatgpt.com` or `claude.ai`, click the toolbar icon, toggle theming
   for that host and pick a theme. Changes apply live — no reload.

## Project layout

```
entrypoints/
  background.ts        # service worker (first-run defaults; M3 fetch stub)
  content.ts           # document_start: cloak, apply, observe, health-check
  popup/               # vanilla-TS control surface
src/
  adapters/            # adapter map (host bindings) — pure swappable data
  engine/              # apply / observer / health-check (all consuming logic)
  themes/              # schema + validator + base-aware fallback + builtins
  storage/             # chrome.storage.local layer (per-host settings)
  util/                # color parsing, WCAG contrast, hex->HSL
wxt.config.ts          # manifest + WXT config
```

## Privacy

Minimal permissions: `storage` plus host access to `chatgpt.com` and `claude.ai`
only (no `<all_urls>`). No prompts, responses, page text, or personal data are
ever read or transmitted. Telemetry (when added in M3) will be opt-in and limited
to structural failure signals.
