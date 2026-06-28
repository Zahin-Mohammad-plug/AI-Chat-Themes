# Devlog

## 2026-06-28 — Fix: Claude response text black-on-dark (cds-root scope, v0.1.2)

**Bug:** on a dark theme, Claude's assistant message text rendered near-black
(`rgb(11,11,11)`) on the dark surface. Diagnosed live: Claude's newer design
system wraps message content in `.cds-root`, which defines its *own* token scale
and reads `data-mode` **on the element itself** — our `<html>[data-mode]` didn't
reach it, so cds defaulted to light (black text). 36 such roots on a long chat,
none carrying `data-mode`.

**Fix:** `ColorModeSpec` gained optional `scopes: string[]`; Claude's adapter
sets `scopes: ['.cds-root']`. `applyColorMode` now propagates the mode marker to
every scope element as well as `<html>`, and `restoreColorMode` clears them. The
existing debounced observer re-applies as new message roots stream in. Verified
live (setting `data-mode=dark` on the 36 cds-roots turned response text white).
25 tests (1 new). v0.1.2.



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

## 2026-06-28 — Schema v2 (expressive themes) + five showcase themes

Adopted PRD v1.1 (schema v2). Old PRD archived to `docs/PRD-v1-archive.md`;
`docs/PRD.md` is now the v1.1 spec (product name preserved). Schema v2 is the M2
milestone, **not** Phase 2 — the hosted store (M4) stays deferred as recommended.

**Schema (additive, v1 themes still load).** Bumped `SCHEMA_VERSION` to 2 and
added three optional blocks to `Theme`/`PartialTheme` (`src/themes/types.ts`):
`effects` (Tier-1 `appGradient` + `accentGlow`), `material` (Tier-2 textured
background + mandatory readability scrim), and `motion` (schema-only,
forward-compatible — no built-in ships motion yet). A theme with none of them is
a plain palette theme and normalizes exactly as before. `normalizeTheme` now
sanitizes the new blocks and defaults `class:'palette'`, `fidelityTier:1`.

**Security (PRD 6.2 / 13.3).** Imported expressive CSS is guarded: external
`url()`, `@import`, `expression()`, and `javascript:` are stripped from
gradients/sizes; `material.texture` only accepts a bundled asset id (no raw
url/scheme); the scrim is clamped to a ≥0.5 readability floor; motion without a
`reducedMotionFallback` is dropped with a warning.

**Engine (`src/engine/apply.ts`).** `buildThemeCss` now appends an expressive
layer: a scrimmed material texture and/or an effects gradient painted on the app
shell (`html, body, main`, `background-attachment: fixed`), plus an accent
text-shadow glow on links. It targets the universal roots both adapters already
theme, so behavior is **identical on ChatGPT and Claude** with no host-specific
selector — and message surfaces stay opaque, so body text never sits on raw
texture (the ambiance shows on the landing screen, gutters, sidebar, composer
frame). Always layered on the palette floor: an unknown texture or absent layer
degrades cleanly to palette (PRD 6.1).

**Textures (`src/themes/assets.ts`).** `forest` and `cyber` are procedural inline
SVGs encoded as `data:` URIs — license-clean, byte-tiny, MV3-safe (no remote
fetch, no web-accessible resources, no asset FOUC), each based on its theme's
`bg.app` so the scrim composites to an on-palette, AA-readable surface.

**Themes (`src/themes/builtins.ts`).** Added the five hero themes from the
reference mock: Midnight OLED (palette, amoled), Paper (palette, warm light),
Aurora (Tier-1 gradient), Forest (Tier-2 forest texture), Cyberpunk (Tier-2 city
texture + neon glow). All declare `appliesTo: ['chatgpt','claude']` and pass the
WCAG AA built-in contrast gate.

**Popup.** Gallery cards now render a wide preview bar showing the gradient or
texture for expressive themes (`entrypoints/popup/`).

**Honest Tier-2 caveat.** Because host message surfaces are opaque (and Claude's
hsl-triple token path can't carry alpha), the forest/cyberpunk textures frame the
app rather than sitting behind every message — most visible on the empty landing
screen (which is exactly what the reference mock shows). This is the documented
Tier-2 best-effort behavior, not whole-app material fidelity.

Gate: `pnpm compile` clean, `pnpm test` 37/37, `pnpm lint` clean, `pnpm build`
ok (content bundle 40.6 kB incl. both textures). Reload the unpacked extension to
pick up the new build.

## 2026-06-28 — M3 resilience hardening (remote map, fingerprinting, kill switch, telemetry)

Built the resilience spine (PRD §5 / EPIC C). Designed to run fully offline and
ship safe: both network endpoints are NULL by default (`src/config.ts`), so the
extension fetches nothing out of the box (clean for Web Store review) while the
full client pipeline is implemented and unit-tested. Flip a constant to activate.

**C1 — remote adapter map (`src/adapters/remote.ts`, `entrypoints/background.ts`).**
Background worker fetches a versioned JSON map, runs strict structural validation
(`validateAdapterMap` — every host/tokenFormat/token-key/selector checked), and
caches it only if it is valid AND strictly newer than what we already trust.
`selectActiveMap` picks newest-valid, with the bundled snapshot as the floor.
Any failure (offline, 404, malformed, tampered, older) silently keeps the
cached/bundled map — a poisoned map can never brick the host page. Refresh on
install/startup + every 12h via `chrome.alarms` (added the `alarms` permission;
hosts unchanged).

**C2 — host fingerprinting.** Adapters carry durable `signals` (known CSS vars /
DOM landmarks); `adapterForHost` picks the matching shape, trying `variants`
first then the default, so one map can support several host versions during a
rollout. Bundled adapters fingerprint on `--main-surface-primary` (ChatGPT) and
`--bg-000` (Claude).

**C3 — self-healing.** Health check already degrades (unresolved anchors just
aren't applied — native, never half-themed); now misses optionally feed
telemetry. Surface-level kill switch added: `activeAnchors` drops
`disabledAnchors[host]` ids; per-host `killSwitch` still disables theming wholesale.

**C4 — opt-in telemetry (`src/engine/telemetry.ts`).** Off by default
(`telemetryEnabled` in storage; toggle in the popup). `buildTelemetryEvent`
constructs events from a frozen field allowlist (host id, fingerprint, missing
anchor ids, ext + map version, ts) — structurally impossible to include prompts,
responses, page content, URLs, or identity. Background double-gates the relay
(opt-in check) and no-ops unless `TELEMETRY_URL` is set.

Gate: `pnpm compile` clean, `pnpm test` 48/48 (+11: remote 8, telemetry 3),
`pnpm lint` clean, `pnpm build` ok. New deferred work: publish a signed map at a
CDN + add the origin to host_permissions to turn on remote updates.
