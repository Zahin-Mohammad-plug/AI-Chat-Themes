# AGENTS.md — working in this repo

Guidance for coding agents (and humans) extending **AI Chat Themes**. Read this
before editing. The product spec is [docs/PRD.md](docs/PRD.md); the running log
is [devlog.md](devlog.md); the per-pass record is
[docs/BUILD_PLAN.md](docs/BUILD_PLAN.md).

## The one rule that matters

**Strict separation of three layers (PRD §8):**

1. **Theme data** — `src/themes/` (`types.ts`, `schema.ts`, `builtins.ts`).
   Abstract color *tokens*. A theme NEVER names a host CSS class or selector.
2. **Host binding** — `src/adapters/` (`map.ts`). Maps abstract anchors/tokens
   to host-specific selectors and CSS-variable names. Pure **data** so it can be
   shipped as a remote JSON update later (MV3 allows remote CSS/JSON, never code).
3. **Engine** — `src/engine/` (`apply.ts`, `observer.ts`, `health.ts`). The only
   code that *consumes* 1 and 2.

> If you're adding a theme, you should touch only layer 1. If you're fixing a
> host that changed its DOM, you should touch only layer 2. If you find yourself
> hardcoding a host class in a theme, stop — that belongs in the adapter map.

## Invariants (do not break without sign-off)

- **No remote code, ever.** MV3 forbids it and the store will reject it. Remote
  updates (M3) fetch versioned JSON/CSS only, integrity-checked, with bundled
  fallback. All executing logic ships in the package.
- **Minimal permissions.** `storage` + `chatgpt.com` + `claude.ai`. Never add
  `<all_urls>` or broad host permissions.
- **No content collection.** Never read or transmit prompts, responses, page
  text, URLs (beyond host origin), or user identity. Telemetry is opt-in and
  structural-only.
- **Degrade to native, never to broken.** A missing anchor or failed token must
  leave the host surface fully usable. The engine must never throw onto the page.
- **FOUC failsafe.** The page must always reveal within the failsafe bound
  (`REVEAL_FAILSAFE_MS`) even if theme application fails. Cloak is background-
  paint only — never hide the app root in a way that can blank the page.
- **Built-in contrast.** Built-in themes must pass WCAG AA body contrast; this is
  enforced by `assertBuiltinContrast` and a unit test. Add new built-ins to the
  test's coverage (it iterates `BUILTIN_THEMES` automatically).

## Adding a built-in theme

Edit `src/themes/builtins.ts`: add a `BuiltinSpec` (id `builtin-<slug>`, a base,
a one-line blurb, and tokens). Run `pnpm test` — the contrast test will fail if
body text doesn't meet AA. Tokens you omit are filled from base-aware defaults
(`deriveTokens`), so a partial spec is fine.

## Targeting a new host surface

Edit the relevant host in `src/adapters/map.ts`:

- Prefer **tier 1**: add a `--host-var → tokenKey` entry in `tokenVars`.
- Else **tier 2/3**: add an `AnchorRule` with a *stable* `selector` (semantic /
  `data-*` / ARIA / structural — not a hashed utility class) and a `style` map of
  CSS property → token key. Give it a unique `id` (used by the health check).

## Commands

```bash
pnpm dev | dev:firefox     # HMR
pnpm build | build:firefox # production -> .output/
pnpm test                  # Vitest
pnpm compile               # tsc --noEmit (run before committing)
pnpm lint | format
```

## Conventions

- TypeScript, strict mode, `@/` path alias = repo root.
- Imports of source modules use `@/src/...`.
- Keep the engine side-effect-light and framework-free; the popup is vanilla TS.
- Update `devlog.md` after any feature-level change so the next agent has context.
