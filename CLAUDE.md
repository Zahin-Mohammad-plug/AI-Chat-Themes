# CLAUDE.md

Project guidance for Claude Code. This is a thin pointer — the detailed contract
lives in [AGENTS.md](AGENTS.md). Read that first.

## What this is

`AI Chat Themes` — an MV3 Chrome extension (WXT + TypeScript + pnpm) that themes
ChatGPT and Claude.ai via a token-first, resilience-by-design engine. Current
state: **M0 + M1 vertical slice** (see [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md)).

## Before you edit

- The product spec is [docs/PRD.md](docs/PRD.md) and is the source of truth.
- Respect the three-layer separation (theme data / adapter map / engine) and the
  invariants in [AGENTS.md](AGENTS.md) — especially **no remote code**, **minimal
  permissions**, **no content collection**, and **degrade to native, never broken**.

## After you edit

- Run `pnpm compile && pnpm test && pnpm lint && pnpm build` before declaring done.
- Append a dated entry to [devlog.md](devlog.md) for any feature-level change.

## Fast facts

- Path alias: `@/` = repo root; source imports use `@/src/...`.
- Build output: `.output/chrome-mv3` (load unpacked).
- Add a theme → `src/themes/builtins.ts`. Fix a changed host → `src/adapters/map.ts`.
- Popup is vanilla TS in `entrypoints/popup/`.
