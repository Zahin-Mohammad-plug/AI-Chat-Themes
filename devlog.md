# Devlog

Reverse-chronological log of feature-level changes, for agentic continuity.
Append a dated entry whenever you complete something meaningful. Keep entries
short: what changed, why, and anything the next agent should know.

---

## 2026-06-23 — M0 + M1 vertical slice (initial scaffold)

**Built the extension from an empty repo to a runnable MV3 build in one pass.**

What landed:

- **Tooling**: WXT 0.19 + TypeScript (strict) + pnpm. ESLint (flat config) +
  Prettier + Vitest. `pnpm build` produces `.output/chrome-mv3` (~69 kB total).
- **Manifest**: MV3, minimal perms (`storage` + the two hosts, no `<all_urls>`),
  content script at `document_start`, background service worker, popup.
- **Engine** (`src/engine`): `apply.ts` builds a stylesheet from theme tokens +
  adapter map (tier-1 CSS-var overrides + tier-2/3 semantic anchors, all
  `!important`); `observer.ts` (debounced 150 ms, childList-only); `health.ts`
  (anchor resolution check, never throws).
- **Themes** (`src/themes`): versioned schema, validator with base-aware
  fallback + WCAG contrast checks, and 12 built-ins (Dark/Light/AMOLED + Dracula,
  One Dark Pro, Night Owl, Synthwave '84, Material Ocean, Catppuccin Mocha,
  GitHub Dark, Cobalt2, Ayu Mirage). All built-ins pass AA (unit-tested).
- **Adapter map** (`src/adapters`): bundled fallback for both hosts. ChatGPT uses
  `tokenFormat: 'color'`; Claude uses `'hsl-triple'` (engine converts theme
  colors to `H S% L%` for `hsl(var(--token))`). Kill-switch flag honored.
- **Storage** (`src/storage`): `chrome.storage.local`, per-host `{enabled,
  themeId}`, custom-theme list (re-validated on read), change subscription.
- **FOUC**: background-paint cloak at `document_start` using a synchronous
  page-`localStorage` snapshot of last `bg.app`/`text.primary`; unconditional
  reveal after 800 ms failsafe.
- **Popup**: vanilla TS — per-host enable toggle, theme gallery with swatches +
  blurbs, live apply (writes storage → content script re-applies via change
  listener), and the unsupported-site state.

Verification: `pnpm compile`, `pnpm test` (7 pass), `pnpm lint`, `pnpm build` all
green.

Known caveats / next-agent notes:

- Host CSS-variable names are **best-effort from public knowledge** and will
  drift. The anchor layer is the safety net until the M3 remote map ships. If a
  host looks unthemed, first re-check its token names in DevTools and update
  `src/adapters/map.ts` (data only).
- Icons are generated placeholders — replace before store submission.
- Not yet built (by design): remote map fetch, fingerprinting, telemetry,
  live editor, import/export UI, store, advanced-CSS sandbox. Seams documented in
  `docs/BUILD_PLAN.md`.

Suggested next steps (M2): live theme editor + import/export (validator already
exists), then M3 remote adapter-map pipeline (background stub already in place).
