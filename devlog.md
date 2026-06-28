# Devlog

## 2026-06-28 — Fix: light themes broke host menus/modals (v0.1.1)

**Bug (reported on ChatGPT settings/menus in light mode):** the engine overrode
CSS design tokens but never reconciled the host's own light/dark mode. ChatGPT
keeps `class="dark"` on `<html>`, so its Tailwind `dark:` utilities (modals,
menus, settings dialog) kept rendering dark and clashed with a light theme —
unreadable. CSS-variable overrides can't reach utility classes.

**Fix:** the engine now syncs the host's native color mode to the theme base
(PRD 16 precedence). Hosts differ, so the mechanism is data in the adapter map:
- ChatGPT → toggle `class="dark"` on `<html>`.
- Claude  → set `data-mode="dark|light"` on `<html>` (verified live; Claude does
  not use a `dark` class).
`applyColorMode()` sets the class/attr + `color-scheme` from `theme.base`;
`captureColorMode()`/`restoreColorMode()` save and restore the user's original
mode on toggle-off. Verified live: ChatGPT settings dialog renders correctly
light. Added unit tests for both mechanisms (24 tests total). Bumped to v0.1.1
for store resubmission.



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

### Live verification (2026-06-23, Work profile, Chrome 149)

Loaded unpacked into the real logged-in Work profile and confirmed end-to-end on
both hosts with the `builtin-dark` theme:

- **claude.ai** — `data-act-theme=builtin-dark`; Claude's HSL design tokens
  overridden (`--bg-000: 240 6.7% 5.9%`, `--text-000: 0 0% 92.5%`,
  `--accent-main-100: 232.7 100% 74.3%`); `body` computed bg `rgb(14,14,16)`,
  text `rgb(236,236,236)`. Whole app shell/sidebar/composer dark.
- **chatgpt.com** — same theme/engine; ChatGPT's color tokens overridden as raw
  hex (`--bg-primary: #0e0e10`, `--main-surface-primary: #16161a`,
  `--text-primary: #ececec`); `body` bg `rgb(14,14,16)`. Sidebar/main/composer
  dark, accent-purple voice button.
- **FOUC** — cloak snapshot armed in page localStorage
  (`act:cloak:chatgpt = {"bg":"#0e0e10","text":"#ececec"}`) so reloads pre-paint.
- **Graceful degradation** — host toast ("Fable 5 unavailable") left native, as
  intended for elements with no token mapping.

Gotcha for future loading: **Chrome 149 (stable) removed `--load-extension`** and
the `DisableLoadExtensionCommandLineSwitch` override no longer works — verified
the extension does not appear in CDP targets when launched that way. Unpacked dev
loading now requires the `chrome://extensions` → Load unpacked UI (native file
picker). `pnpm dev` (web-ext) likely affected too; load manually on Chrome stable.
The popup theme-switcher couldn't be exercised via automation (needs a toolbar
click) but is wired + unit-tested.

### Adapter fix from live e2e: ChatGPT header gap

Live testing surfaced a real coverage gap: ChatGPT's `<header class="sticky
top-0">` hardcodes `rgb(0,0,0)`. It blended into dark/AMOLED themes but showed as
a dark strip under the Light theme. This is exactly the host-specific surface the
adapter map exists for — fixed by adding an `app.header` anchor
(`header → bg.app + text.primary`) to both hosts in `src/adapters/map.ts` (data
change, no engine change). Verified live (header went white under Light), then
rebuilt (tests green). Reload the unpacked extension to pick up the new build.

Also observed e2e: storage-driven theme selection persists across reload (a Light
selection re-applied from chrome.storage at document_start), and the engine
renders non-default themes correctly on the live host (Dracula confirmed).
