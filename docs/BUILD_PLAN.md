# Build Plan — AI Chat Themes

This document records what was built in the first autonomous pass, the decisions
and assumptions made, and what remains. The single source of truth for *intent*
is [PRD.md](./PRD.md); this file is the *implementation log* that complements the
running [../devlog.md](../devlog.md).

## Scope of this pass

**Milestone 0 (spike) + Milestone 1 vertical slice** only, per the build brief.

Delivered:

- A loadable, building **MV3** extension via **WXT** + TypeScript + pnpm.
- Token-first theming **engine** (override host CSS custom properties + scoped
  semantic-anchor `<style>`), wired to a **bundled adapter map** for both hosts.
- **12 built-in themes** as data: Dark, Light, AMOLED, Dracula, One Dark Pro,
  Night Owl, Synthwave '84, Material Ocean, Catppuccin Mocha, GitHub Dark,
  Cobalt2, Ayu Mirage. All pass WCAG AA body contrast (enforced by test).
- **FOUC cloak** at `document_start` with a synchronous page-`localStorage`
  snapshot, plus an **800 ms failsafe reveal**.
- **Debounced, scoped MutationObserver** for SPA route changes / dynamic surfaces.
- **Post-apply health check** (anchor resolution) — degrade to native on miss.
- **Popup**: per-host on/off toggle + theme gallery with live apply, plus the
  "not a supported site" state.
- Schema + validator + base-aware fallback + contrast validation (unit-tested).
- ESLint + Prettier + Vitest configured and green.

Explicitly **stubbed / out of scope** this pass (per brief): theme store,
accounts, billing, the remote adapter-map fetch pipeline, fingerprinting,
opt-in telemetry, the live theme creator/editor, import/export UI, and the
advanced-CSS sandbox. The architecture leaves clean seams for each (see below).

## Decisions

1. **Framework: WXT** (`wxt.dev`), as the brief's primary choice. No fallback to
   `@crxjs/vite-plugin` was needed — WXT scaffolded, built, and produced a valid
   MV3 manifest on the first pass.
2. **Popup UI: vanilla TypeScript.** No framework. Keeps the bundle tiny and
   matches the brief's "no heavy UI deps in this pass."
3. **Token format per host.** ChatGPT consumes design tokens as plain colors
   (`--token: #rrggbb`); Claude consumes them as `hsl(var(--token))`, i.e. bare
   `H S% L%` triples. The adapter map declares a `tokenFormat` per host and the
   engine converts theme colors to HSL triples for Claude at runtime. This is
   the durability lever from PRD §6.2 tier 1.
4. **Belt-and-suspenders application.** The engine applies **both** tier-1 token
   overrides **and** tier-2/3 semantic-anchor rules (`html, body`, `main`,
   `nav`, `#prompt-textarea`, `pre`). If token names drift on a host, the anchor
   layer still produces a visible, safe theme. All declarations use `!important`
   to win the author cascade; nothing brittle (hashed classes) is hardcoded —
   those would live only in the (future) remote map per PRD §5.2 tier 4.
5. **FOUC cloak is background-paint only**, never `visibility:hidden` on the app
   root. A cloak failure can therefore never blank the page; worst case is a
   brief native flash. Combined with the unconditional 800 ms failsafe.
6. **Sync cloak channel = the host page's `localStorage`.** `chrome.storage` is
   async, too slow for `document_start`. The content script (isolated world)
   shares the page origin's `localStorage`, so the last theme's `bg.app` /
   `text.primary` are cached there and read synchronously to pre-paint.
7. **Storage: `chrome.storage.local` only** this pass. `chrome.storage.sync`
   (PRD §14) deferred; local-first satisfies offline-functional requirement.
8. **Kill switch present in the bundled map** as a data flag and honored by the
   content script, even though the remote update channel that would set it is
   M3. This keeps the consumer logic complete now.
9. **Icons** are generated placeholders (accent rounded-square on dark) via a
   zlib PNG script — no native image deps. Flagged for real artwork before store
   submission.

## Assumptions

- **Host CSS custom-property names** (`--bg-primary`/`--main-surface-*` for
  ChatGPT; `--bg-000…500`, `--text-000…500`, `--accent-main-*` for Claude) are
  taken from public knowledge of these apps. They are best-effort and *expected*
  to drift — which is exactly why the anchor layer + (future) remote map exist.
  Overriding a token that no longer exists is harmless (a no-op).
- Both hosts are SPAs that mutate the DOM heavily; the observer is intentionally
  coarse (childList additions only, 150 ms debounce) to avoid thrash.
- Cross-origin/sandboxed surfaces (PDF/artifact iframes) are out of scope and
  left native (PRD §7); not addressed this pass beyond "do no harm."
- Node 20 + pnpm 10 (the environment in use).

## Architecture seams for later milestones

| Future work | Seam already in place |
|---|---|
| M2 Creator / import-export | `normalizeTheme()` validates+sanitizes any object; `saveCustomTheme()` persists; popup already renders custom themes from storage. |
| M3 Remote adapter map | `AdapterMap` is pure data; `background.ts` has the documented fetch/validate/cache stub; engine consumes the map without code changes. |
| M3 Fingerprinting | `HostAdapter.fingerprint` field + map keyed per host already modeled. |
| M3 Telemetry | `runHealthCheck()` returns structural-only data (anchor ids/version) ready to relay opt-in. |
| M4 Store / advanced CSS | `advancedCss` is parsed-but-dropped today; a sanitizer slots in at `normalizeTheme()`. |

## How to verify

```bash
pnpm install
pnpm build        # -> .output/chrome-mv3 (load unpacked)
pnpm test         # schema/contrast unit tests
pnpm compile      # tsc --noEmit
pnpm lint
```

Load `.output/chrome-mv3` via `chrome://extensions` → Developer mode → Load
unpacked. Open chatgpt.com or claude.ai, click the toolbar icon, pick a theme.
