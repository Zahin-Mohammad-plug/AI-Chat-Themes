# PRD: Cross-Platform Theme Engine for ChatGPT & Claude.ai

**Name:** AI Chat Themes: Custom Themes & Dark Mode for ChatGPT and Claude
**Type:** Chrome Extension (Manifest V3), Chromium-first, Firefox-portable
**Status:** Draft v1, ready for agent decomposition
**Owner:** Zahin
**Audience:** Coding agents + reviewing engineer

---

## 0. How to read this document

Every requirement is tagged with one of three buckets:

- **[INVARIANT]** Load-bearing. Do not change without sign-off. Breaking this breaks the product thesis.
- **[ADAPT]** Adapt to the host environment, libraries, or framework the implementing agent is working in. Intent is fixed, implementation is free.
- **[REF]** Reference only. Context, rationale, examples. Not a hard requirement.

Acceptance criteria are written so each task is independently verifiable.

---

## 1. Product intent (preserved core)

A browser extension that lets users apply, customize, and create visual themes for the **ChatGPT** and **Claude.ai** web apps, that **keeps working when those apps push UI changes**, that handles their varied surfaces (chat, code blocks, PDF viewer, canvas/artifacts, sidebars) and viewports, and that optionally supports a **theme store** for sharing community themes.

**[INVARIANT]** The product thesis is not "another theme picker." It is "the theming layer that does not break, across both major assistants, with a real creator." Resilience and cross-platform coverage are the differentiators. If those are cut, the product is undifferentiated in a crowded market.

---

## 2. Critique of the brief (gaps resolved in this PRD)

The concept as briefed has the right instincts but leaves these unspecified. This PRD resolves each:

1. **"Scalable" was undefined.** In this domain scalable does not mean traffic. It means *resilient to upstream DOM and CSS changes*. Resolved in Section 5 (Resilience architecture).
2. **No targeting strategy.** Naively selecting hashed Tailwind/CSS-module classes guarantees breakage. Resolved with a token-first targeting hierarchy in Section 6.
3. **Update cadence vs Chrome review.** Every selector fix would otherwise require a multi-day store review. Resolved with the MV3-compliant remote adapter map in Section 5.3.
4. **Surface coverage was a list, not a model.** Code blocks, PDF viewer, and artifacts behave differently (some are canvas/iframe and not CSS-themeable). Resolved with the Surface Coverage Matrix in Section 7.
5. **No FOUC plan.** Theme-on-load flicker is the most common 1-star complaint for this category. Resolved in Section 11.1.
6. **Store treated as a maybe with no risk model.** User-generated CSS is a real security and moderation surface. Resolved in Section 13, recommended as a later phase.
7. **No degradation behavior.** What the extension does when a selector is missing was undefined. Resolved with graceful degradation + self-healing telemetry in Section 5.4.

---

## 3. Goals and non-goals

### 3.1 Goals [INVARIANT]
- Apply themes to ChatGPT (`chatgpt.com`) and Claude.ai (`claude.ai`) without breaking host functionality.
- Survive routine host UI updates without an extension republish in the common case.
- Provide a live theme creator with real-time preview.
- Support import/export of themes as portable files.
- Degrade gracefully and visibly when a surface cannot be themed.

### 3.2 Non-goals (v1) [REF]
- Not changing host *behavior* (no prompt tools, folders, exporters, model switchers). Appearance only. Behavior features are a separate product and dilute the thesis.
- Not theming mobile native apps. Web app surfaces only.
- Not guaranteeing pixel theming of canvas-rendered content (e.g. rasterized PDF pages). See Section 7.
- Not Safari in v1. Chromium first, Firefox second.

---

## 4. Users and use cases

### 4.1 Primary users [REF]
- Heavy daily users of ChatGPT and/or Claude who want reduced eye strain, dark/AMOLED, or aesthetic personalization.
- Developers who want readable code blocks and a syntax theme that matches their editor.
- "Customizers" who want to build and share looks (the store audience).

### 4.2 Representative use cases [REF]
- Switch to a built-in dark/AMOLED theme in one click.
- Build a custom theme (background, surfaces, accent, fonts, code theme), preview live, save it.
- Apply different themes per host (one look for ChatGPT, another for Claude).
- Export a theme to a file and send it to a friend; import a received theme.
- (Phase 2) Browse a store, install a community theme, rate it.

---

## 5. Resilience architecture (the core of the product) [INVARIANT]

This section is the reason the product exists. Implementing agents should treat it as the spine.

### 5.1 Threat model: what changes upstream
Hosts change, in rough order of frequency:
1. Hashed class names (Tailwind utilities, CSS-module hashes). Change almost every deploy.
2. DOM structure (wrappers added/removed, elements re-parented).
3. New surfaces (a new PDF viewer, a new canvas/artifact panel).
4. CSS custom property (design token) names. Change rarely.
5. Origin/iframe structure for embedded content.

### 5.2 Targeting hierarchy [INVARIANT]
Selectors must be chosen in this priority order. Higher tiers are more durable. A theme should reach for the lowest-numbered tier that works.

1. **Override the host's own CSS custom properties (design tokens).** ChatGPT and Claude both expose large sets of CSS variables (surface, text, border, accent colors). Overriding `--token` values cascades automatically and survives class renames. This is the most durable lever and should carry the majority of color theming.
2. **Stable semantic anchors:** `data-*` attributes, ARIA roles, element roles, `id`s, landmark structure (`main`, `nav`, `[role="dialog"]`). More stable than utility classes.
3. **Structural relationships** that express intent (e.g. "the first child of the composer container") only where 1 and 2 are insufficient.
4. **Hashed/utility class selectors.** Last resort. **[INVARIANT]** These may live *only* in the remote adapter map (5.3), never hardcoded in bundled theme CSS, because they are the things that break.

### 5.3 Remote adapter map (MV3-compliant update channel) [INVARIANT]
**Feasibility note (verified):** Manifest V3 prohibits remotely hosted *code* (JavaScript and Wasm only). It explicitly permits fetching and caching remote **CSS** and **JSON** at runtime, including config that determines which features are enabled, provided all executing logic ships in the extension package. CSS and JSON are not classified as remote code. Do not fetch anything that is interpreted as logic (no remote templating engines, no remote JS). This is the line the implementation must not cross or it risks a "Blue Argon" store rejection.

Design:
- The extension ships with a **bundled fallback** adapter map and bundled base themes (so it works offline and on day one of a host change before a hotfix lands).
- At runtime it fetches a versioned **adapter map** (JSON) and optionally **theme CSS bundles** from a CDN, caches them in `chrome.storage.local`, and prefers the newest valid version.
- The adapter map is a **data structure only**: it maps abstract "anchors" (e.g. `composer.background`, `sidebar.surface`, `codeblock.header`) to host-specific selectors and to the token names to override, per host, per host-version.
- All logic that *consumes* the map (applies CSS variables, injects `<style>`, runs observers) lives in the bundled extension code.

**[INVARIANT]** Cached remote payloads must be **integrity-checked** (version + signature or hash) before use, with automatic fallback to the bundled snapshot on validation failure. A poisoned or malformed map must never brick the host page.

**[ADAPT]** CDN/storage choice, signing scheme, fetch cadence, and cache TTL are implementation decisions. Suggested: signed JSON, fetch on startup + every N hours, stale-while-revalidate.

### 5.4 Self-healing and graceful degradation [INVARIANT]
- A lightweight **health check** runs after theme application: verify that the expected anchors resolved to at least one element each.
- If an anchor fails to resolve (host changed), the extension must:
  1. Skip that anchor without throwing.
  2. Leave the host surface in its native, fully usable state (never apply half a theme that hides text or breaks layout).
  3. Record the failed anchor (host, host fingerprint, anchor id) for telemetry.
- **[INVARIANT]** Privacy boundary: telemetry may report only structural failure data (anchor ids, host version fingerprint, extension version). It must never capture page content, prompts, responses, URLs beyond host origin, or user identity. See Section 15.
- A **remote kill switch** (a flag in the adapter map) can disable theming for a specific host or surface if a host change makes theming actively harmful, until a fix ships.

### 5.5 Host version fingerprinting [ADAPT]
Detect which "shape" of the host the user is on, so the right selector set is chosen. Fingerprint from durable signals (presence of known tokens, DOM landmarks, build hints) rather than brittle ones. The adapter map can carry multiple selector sets keyed by fingerprint, allowing a single extension version to support several host versions at once during rollouts.

---

## 6. Theme schema (token model) [INVARIANT]

Themes are **data**, decoupled from selectors. A theme never names a host class. It names abstract tokens; the adapter map binds tokens to the host. This decoupling is what lets one theme work on both hosts and survive host changes.

**[INVARIANT]** Define a versioned theme schema. Illustrative shape (final field set is [ADAPT]):

```jsonc
{
  "schemaVersion": 1,
  "id": "uuid",
  "name": "Midnight Clay",
  "author": "ahmed",
  "appliesTo": ["chatgpt", "claude"],     // or one
  "base": "dark",                          // dark | light | amoled, drives sane fallbacks
  "tokens": {
    "bg.app": "#0e0e10",
    "bg.surface": "#16161a",
    "bg.elevated": "#1d1d22",
    "text.primary": "#ECECEC",
    "text.secondary": "#A0A0A8",
    "accent": "#B14A28",
    "border.hairline": "rgba(255,255,255,0.08)",
    "composer.bg": "#16161a",
    "sidebar.bg": "#0e0e10"
  },
  "typography": {
    "fontFamily": "Hanken Grotesk, sans-serif",
    "fontScale": 1.0,
    "lineHeight": 1.6,
    "codeFontFamily": "JetBrains Mono, monospace"
  },
  "code": {
    "theme": "one-dark",                   // syntax token palette
    "tokens": { "keyword": "#c678dd", "string": "#98c379" }
  },
  "layout": {
    "chatMaxWidth": "48rem",
    "wideMode": false,
    "hideElements": ["upgrade-chip"]       // from an allowlist, see 7
  },
  "advancedCss": null                       // power-user raw CSS, sandboxed, see 13.3
}
```

**[INVARIANT]** Every token has a **base-aware fallback**. If a theme omits a token, the engine derives a safe value from `base` so partial themes never produce unreadable contrast (e.g. dark text on dark surface).

**[INVARIANT]** Contrast safety: the engine validates `text.primary` against `bg.surface` and `bg.app` for a minimum contrast ratio and warns in the creator. It must not be possible to save a built-in theme that fails WCAG AA on body text. User custom themes may warn but still save.

---

## 7. Surface coverage matrix [INVARIANT]

Each host surface gets an explicit strategy and an explicit degradation behavior. **[INVARIANT]** "Not themeable" surfaces must be left native and usable, never partially styled.

| Surface | Themeable via | Strategy | If it changes / fails |
|---|---|---|---|
| App shell (bg, sidebar, header) | Tokens + semantic anchors | Token override first | Leave native shell |
| Message stream (user/assistant) | Tokens + anchors | Token override, optional bubbles | Leave native |
| Composer / input | Tokens + anchors | Token override | Leave native |
| Code blocks (syntax) | Code token palette | Map to host highlight classes OR ship our highlight CSS variables | Fall back to host's own code theme |
| Code block chrome (header, copy btn) | Anchors | Style header/buttons | Leave native |
| PDF viewer | Partial | Theme the surrounding chrome only. Rasterized/canvas pages are pixels, not CSS. Optional opt-in invert filter, off by default, with a warning that it can distort. | Theme chrome only |
| Canvas / Artifacts panel | Partial | Side panel chrome is themeable. Inner content may be a sandboxed/cross-origin iframe and may be uninjectable. | Theme panel chrome, leave inner content native |
| Modals / menus / tooltips | Tokens + `[role]` anchors | Token override | Leave native |
| Settings pages | Tokens | Token override | Leave native |

**[REF]** Cross-origin or sandboxed iframes (some artifact/canvas content) cannot be styled by a content script on the parent origin. Declare match patterns for any same-origin embedded surfaces; treat cross-origin ones as out of scope and degrade. Do not attempt workarounds that violate the host's frame sandbox.

### 7.1 Viewport coverage [INVARIANT]
- Themes must hold at: wide desktop, laptop, narrow window, and the host's responsive breakpoints (collapsed sidebar, mobile-web layout).
- **[INVARIANT]** Theme CSS must not hardcode pixel layout that fights the host's responsive rules. Prefer relative units and override colors/typography, not structural layout, except for explicit opt-in layout features (wide mode, chat width) which must themselves be responsive-safe.

### 7.2 Element hiding [ADAPT]
Hiding elements (e.g. upgrade chips) is offered only from a **curated allowlist** of safe, non-functional elements, each mapped through the adapter map. **[INVARIANT]** Never allow hiding of functional controls in a way that traps the user. Arbitrary "hide this" via raw CSS is a power-user feature gated behind Section 13.3.

---

## 8. System architecture [ADAPT]

Components (names illustrative):

- **Content script (document_start, static CSS + JS):** applies the pre-paint cloak (11.1), reads cached active theme, injects theme `<style>`, sets token variables. Runs the consumer logic over the adapter map.
- **MutationObserver controller:** watches for SPA route changes and dynamically mounted surfaces (new code block, opened artifact panel, opened PDF), and (re)applies the relevant anchors. **[INVARIANT]** Must be debounced and scoped to avoid performance regressions on long chats. No full-document re-scan on every mutation.
- **Background service worker:** fetches and validates the remote adapter map and theme bundles, manages cache, schedules refresh, owns the kill switch state, relays telemetry (opt-in).
- **Popup / control surface:** theme selection, per-host assignment, quick toggles.
- **Theme editor (extension page or in-page panel):** live creator (Section 12).
- **Storage layer:** see Section 14.
- **(Phase 2) Store client + backend:** see Section 13.

**[INVARIANT]** Strict separation: theme *data* (schema), host *binding* (adapter map), and *application* (engine code). An agent working on themes must never need to touch selectors, and vice versa.

---

## 9. Data flow [REF]

1. Page loads. Content script runs at `document_start`, applies cloak, reads cached active theme + adapter map from storage, applies tokens before first paint, reveals.
2. Observer watches for surfaces appearing; applies anchors as they mount.
3. Background worker, on schedule, fetches latest adapter map + theme bundles, validates, updates cache.
4. Health check reports unresolved anchors (if telemetry opted in).
5. User edits a theme; editor writes to storage; engine re-applies live.

---

## 10. UX requirements

### 10.1 Popup (primary control) [INVARIANT]
- Shows active theme, a gallery of installed themes, and a per-host toggle (ChatGPT on/off, Claude on/off).
- One-click apply. Instant, no reload required.
- Clear "not on a supported site" state when the active tab is neither host.
- Entry point to the editor and (Phase 2) the store.

### 10.2 In-page quick switcher [ADAPT]
- Optional floating control on the host page for fast theme switching, toggleable, and itself themed so it does not clash. Must be dismissible and must never overlap host controls.

### 10.3 Onboarding [REF]
- First run: pick a starting theme, explain the per-host model in one screen, set expectations about graceful degradation ("if the site changes, themes stay safe and we patch fast"). Keep it to one or two screens.

---

## 11. Non-functional requirements

### 11.1 FOUC / flash prevention [INVARIANT]
The hardest UX detail in this category. Required behavior:
- A static CSS file injected at `run_at: document_start` applies a **cloak** (e.g. neutral background matching the cached theme base, or `visibility:hidden` on the app root) so the user never sees the host's default theme flash before the custom theme applies.
- Reveal as soon as tokens are applied.
- **[INVARIANT]** A **failsafe timeout** must reveal the page unconditionally after a short bound (e.g. 800ms) even if theme application fails, so a bug can never leave the page blank/hidden. Native, unthemed, visible always beats blank.
- **[ADAPT]** Because `chrome.storage` reads are async, cache the last applied theme's critical token values in the fastest synchronously-available channel the implementation supports, to minimize the cloak duration.

### 11.2 Performance [INVARIANT]
- No perceptible input latency in the composer.
- Observer work is debounced and scoped; long conversations (thousands of nodes) must not degrade scroll or typing.
- Memory footprint bounded; no observer leaks across SPA navigations.

### 11.3 Accessibility [INVARIANT]
- Contrast validation per Section 6.
- Respect `prefers-reduced-motion` for any extension-added transitions.
- Do not remove focus outlines or trap keyboard focus.
- Editor controls keyboard-navigable and labeled.

### 11.4 Internationalization [REF]
- Do not rely on visible text strings as selectors (a common failure in existing tools). Use structural/semantic anchors so themes work regardless of host UI language.

---

## 12. Theme creator (live editor) [INVARIANT]

- Live preview: edits reflect on the actual host page (or a faithful in-editor preview) in real time.
- Controls for: base (dark/light/amold), each color token (with picker + contrast warnings), typography, code theme, optional layout toggles.
- Save, duplicate, rename, delete.
- Export to a portable theme file (the schema JSON). Import from file.
- **[INVARIANT]** Import must validate against the schema and sanitize before applying (no arbitrary CSS execution path through import unless it goes through the advanced-CSS sandbox of 13.3).
- **[ADAPT]** "Generate from accent color" helper: derive a full token set from one or two seed colors + base, so non-designers get a coherent theme fast. This is a strong differentiator versus preset-only competitors.

---

## 13. Theme store (Phase 2, recommended sequencing) [REF unless promoted]

### 13.1 Recommendation
Ship the **local creator + file-based import/export first**. It delivers 80% of the sharing value with near-zero backend and zero moderation burden. Promote to a hosted store only after the core engine is proven stable across host updates, because the store multiplies your surface area for both maintenance and abuse.

### 13.2 Store scope when built [ADAPT]
- Browse/search/filter themes, preview, one-click install, rate, report.
- Creator accounts, publishing flow, versioning of published themes.
- Backend: theme registry, moderation queue, ratings, abuse reports.

### 13.3 Security: user-generated CSS is an attack surface [INVARIANT]
This is the single most important store risk and is easy to miss.
- Raw user CSS can exfiltrate signal via `url()` requests (attribute selectors + background-image can leak the existence of DOM state to an attacker's server), can cover the page with overlays (clickjacking/phishing), and can hide or impersonate host UI.
- **[INVARIANT]** Therefore: published themes default to the **token schema only** (no raw CSS). An "advanced CSS" capability, if offered, must be (a) sanitized against an allowlist (block `url()` to external origins, block `position:fixed` full-page overlays, block content injection), (b) clearly labeled as advanced/untrusted on install, and (c) subject to moderation before store distribution.
- **[INVARIANT]** Never auto-apply remote user CSS without the install consent step.

### 13.4 Monetization (open decision) [REF]
Options: free + donations (most competitors), freemium (premium theme packs / advanced editor), or store revenue share. Not a v1 requirement. Flagged in Section 17.

### 13.5 Legal / brand posture [REF]
- These hosts have brand guidelines and ToS. Existing extensions disclaim affiliation ("Not affiliated with OpenAI or Anthropic"). Do the same. Do not use their logos/marks as your branding. A store distributing themes that imitate paid host UI could draw attention; keep themes clearly user-customization, not impersonation.

---

## 14. Storage and data model [ADAPT]

- **`chrome.storage.local`:** installed themes, active-theme-per-host, cached adapter map + theme bundles, user settings. Local-first.
- **`chrome.storage.sync`** (optional): small settings (active theme ids, toggles) for cross-device continuity. Mind the sync quota; do not sync full theme bodies if they exceed limits.
- **Remote (Phase 2 only):** the store backend holds published themes and metadata. User's private themes stay local unless they publish.
- **[INVARIANT]** The product is fully functional offline with local themes. Remote is for updates (adapter map, store), never a hard dependency for applying an already-installed theme.

---

## 15. Permissions and privacy [INVARIANT]

- Request the **minimum** host permissions: `chatgpt.com` and `claude.ai` (and any same-origin embedded surfaces actually needed), plus `storage`. Avoid broad `<all_urls>`.
- **[INVARIANT]** No collection of prompts, responses, conversation content, page text, or personal data. Ever.
- Telemetry (Section 5.4) is **opt-in**, anonymous, and limited to structural failure signals and version fingerprints. Publish exactly what is collected.
- Ship a clear privacy policy. Privacy is a real differentiator here and a Chrome Web Store review checkpoint.

---

## 16. Edge cases [INVARIANT to handle, behavior [ADAPT]]

- Host A/B test serves two different DOMs to different users on the same day. (Adapter map keyed by fingerprint, Section 5.5.)
- User logged into multiple host accounts / multiple tabs. Theme applies per host consistently across tabs.
- Host ships a brand-new surface the extension has never seen. Engine ignores it safely; telemetry flags it; adapter map updated later.
- Host's own dark/light setting conflicts with the theme. Define precedence: extension theme wins on themed surfaces, host setting governs untouched surfaces. Avoid fighting the host's `prefers-color-scheme` toggling.
- Very long conversations and streaming responses (DOM mutating rapidly). Observer must not thrash.
- Slow or failed remote fetch. Use bundled fallback silently.
- Corrupted cached map or theme. Validate, discard, fall back.
- Extension update mid-session. New version reconciles cached data and schema versions (migrate or discard with defaults).
- User imports a malformed or malicious theme file. Reject with a clear message; never apply unsanitized.
- PDF viewer or artifact opens inside a cross-origin frame. Degrade to chrome-only theming.
- Print / export views of the host. Do not let extension CSS corrupt host print output.

---

## 17. Open scope decisions (need your call) [REF]

1. **Store: now or later?** Recommendation: file-based sharing in v1, hosted store in Phase 2. Confirm.
2. **Monetization:** free + donations, freemium, or paid packs? Affects whether v1 needs accounts/billing.
3. **Advanced raw CSS:** offer it (power users love it, big security/moderation cost) or stay token-only for safety? Recommendation: token-only for v1, sandboxed advanced CSS later.
4. **Browser targets beyond Chromium:** Firefox in v1 or v2? (Architecture is portable, but it adds test surface.)
5. **Behavior features creep:** confirm v1 stays appearance-only. Competitors bundle exporters/folders; that is a different product.

---

## 18. Milestones / phasing [ADAPT]

- **M0 Spike:** Prove token-override theming on both hosts; map each host's exposed CSS variables; confirm FOUC cloak + failsafe; confirm remote JSON/CSS fetch + cache + fallback. Output: feasibility confirmation + initial adapter map.
- **M1 Core engine:** Schema, engine (apply/observe/health-check), bundled themes (light/dark/amold per host), popup, per-host toggle, FOUC handling. Ships as a working themer.
- **M2 Creator:** Live editor, contrast validation, generate-from-accent, import/export.
- **M3 Resilience hardening:** Remote adapter map pipeline, fingerprinting, kill switch, opt-in telemetry, self-healing.
- **M4 (optional) Store:** Backend, publishing, moderation, ratings, sandboxed advanced CSS.

---

## 19. Agent task decomposition

Epics broken into agent-executable tasks. Each task lists its acceptance criteria. Tasks within an epic are mostly parallelizable unless noted.

### EPIC A. Engine foundation
- **A1. Manifest + scaffolding.** MV3 manifest, host permissions limited to the two hosts + storage, content scripts at `document_start`, background service worker.
  - *Accept:* extension loads on both hosts, no console errors, correct permission prompt, no broad host access.
- **A2. Theme schema + validator.** Implement the versioned schema, a validator, and base-aware fallback derivation.
  - *Accept:* valid theme passes; partial theme fills safe defaults; invalid theme rejected with reason; unit tests cover missing/invalid tokens.
- **A3. Token application engine.** Apply a theme by overriding CSS custom properties + injecting a scoped `<style>`.
  - *Accept:* applying a theme changes app bg/surface/text/accent on the host with no layout breakage; toggling off restores native fully.
- **A4. FOUC cloak + failsafe.** Pre-paint cloak at `document_start`, reveal on apply, unconditional reveal after timeout.
  - *Accept:* no visible flash of native theme on reload with a theme active; if apply is forced to fail, page still reveals native within the timeout.

### EPIC B. Surface coverage
- **B1. Adapter map format + consumer.** Define the JSON adapter map (anchors to selectors/tokens, per host, per fingerprint) and the bundled-fallback consumer.
  - *Accept:* engine themes a surface purely from the map; swapping a selector in the map (no code change) re-targets it.
- **B2. Surface coverage per the matrix (Section 7).** App shell, message stream, composer, modals.
  - *Accept:* each listed surface themes correctly at all viewports in Section 7.1; unthemeable surfaces remain native.
- **B3. Code block + syntax theme.** Code chrome styling + syntax token palette.
  - *Accept:* code blocks adopt the theme's code palette; if syntax mapping fails, host's own code theme remains intact and readable.
- **B4. Dynamic surfaces via observer.** Debounced, scoped MutationObserver for route changes, new code blocks, opened PDF/artifact panels.
  - *Accept:* opening a new surface mid-session themes it; long-chat scroll/typing shows no measurable latency regression; no observer leak across navigations.
- **B5. PDF + artifact degradation.** Chrome-only theming; optional off-by-default PDF invert with warning; cross-origin frame detection.
  - *Accept:* PDF/artifact chrome themes; rasterized/cross-origin content left native; invert is opt-in and warned.

### EPIC C. Resilience
- **C1. Remote fetch + cache + validation.** Background worker fetches adapter map + theme bundles, integrity-checks, caches, falls back to bundled snapshot on failure.
  - *Accept:* valid remote map is used; tampered/malformed map is rejected and bundled fallback used; offline still works.
- **C2. Host fingerprinting.** Detect host shape from durable signals; pick the matching selector set.
  - *Accept:* given two simulated host shapes, the correct selector set is chosen.
- **C3. Health check + self-healing.** Post-apply anchor resolution check; skip-and-degrade on miss.
  - *Accept:* a deliberately broken anchor causes that surface to stay native, not half-themed; no thrown errors.
- **C4. Opt-in telemetry + kill switch.** Anonymous structural failure reporting (opt-in); remote per-host/per-surface disable flag.
  - *Accept:* telemetry off by default and sends nothing until enabled; when on, payload contains only allowed fields (assert no content/URLs); kill switch disables theming for the targeted host/surface.

### EPIC D. UX
- **D1. Popup.** Active theme, gallery, per-host toggles, unsupported-site state, links to editor.
  - *Accept:* apply/switch is instant and persists; correct empty/unsupported states.
- **D2. Live theme editor.** Token controls, picker, contrast warnings, live preview, save/duplicate/delete.
  - *Accept:* edits preview live; cannot save a built-in failing AA body contrast; custom themes warn but save.
- **D3. Import/export.** Export schema JSON; import with validation + sanitization.
  - *Accept:* round-trip export then import reproduces the theme; malformed/malicious import rejected safely.
- **D4. Generate-from-accent helper.** Derive full token set from seed color(s) + base.
  - *Accept:* one seed color produces a coherent, contrast-safe theme.

### EPIC E. (Optional) Store
- **E1. Backend registry + publish flow.**
- **E2. Browse/search/install/rate/report client.**
- **E3. Moderation queue + abuse reporting.**
- **E4. Advanced-CSS sandbox + sanitizer (allowlist, block external `url()`, block full-page overlays).**
  - *Accept (E4):* sanitizer blocks the documented exfiltration/overlay vectors in Section 13.3; advanced CSS requires explicit install consent.

---

## 20. Definition of done (v1, through M3) [INVARIANT]

- Both hosts themeable end to end across the Section 7 surfaces and Section 7.1 viewports.
- No FOUC; failsafe proven.
- A simulated host change (swap selectors in the adapter map) is recovered by a remote map update with no extension republish.
- A broken/missing anchor degrades to native, never to broken.
- Creator can build, preview, save, export, and import a contrast-safe custom theme.
- Permissions minimal; no content collection; telemetry opt-in and structurally limited.
- Passes Chrome Web Store review (no remote code; functionality fully determinable from the package).

---

## 21. Appendix: prior art and references [REF]

- The proven core technique in this category is overriding the host's CSS custom properties (ChatGPT exposes 100+ theme variables). Token-first targeting in Section 6.2 generalizes this and is the durability lever.
- Existing extensions (GPThemes, StylerGPT, Akralys, Claude Themes, ClaudeBuff, Nexus, Claudium) are mostly single-platform, preset-based, locally stored, and openly note they break on host updates and are "optimized for free accounts / not advanced UI." The gaps they leave (cross-platform, resilience-by-design, real creator, store) are this product's differentiation.
- MV3 policy basis for the remote adapter map: remote *code* (JS/Wasm) is prohibited; remote *CSS and JSON config* fetched and cached at runtime is permitted, provided all executing logic ships in the package and nothing remote is interpreted as logic.
