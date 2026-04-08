# Mexai — Agent Context

> Local-first AI context manager. CLI + MCP server. OSS.
> Helps AI agents understand any codebase instantly and stay consistent across sessions.

---

## Project Identity

**What it is:** A CLI tool and MCP server that maintains three layers of context per project — project context, codebase map, and agent rules — and injects them token-efficiently into any AI session.

**Who builds it:** Solo developer (Akash), OSS project, MIT license.

**Current phase:** Phases 1–3 complete. CLI fully implemented (15 commands). Beginning Phase 4 (MCP Server).

**Stack:** TypeScript + Node.js 20+ + pnpm workspaces + Turborepo + tsup + Vitest

---

## Monorepo Structure

```
mexai/
├── packages/
│   ├── core/        # @mexai/core — all domain logic, zero I/O dependencies
│   ├── cli/         # mexai — Commander-based CLI, thin adapter over core
│   └── mcp/         # @mexai/mcp — MCP server, thin adapter over core
├── tooling/
│   ├── tsconfig/    # Shared TS configs
│   └── eslint/      # Shared ESLint config
└── docs/            # Project documentation
```

**Dependency rule:** `cli` and `mcp` depend on `core`. `core` depends on nothing internal. This is enforced — never import from `cli` or `mcp` inside `core`.

---

## Key Conventions

**Types:** All shared types live in `packages/core/src/types.ts`. Never define types elsewhere except locally-scoped generics.

**Schemas:** All Zod schemas in `packages/core/src/schemas.ts`. Every external input is validated before touching the store.

**Errors:** Never throw raw `Error()` in public-facing paths. Use typed error codes (`McpErrorCode`, `StoreError`). Every error has an actionable message.

**Tests:** Co-located with source (`diff-engine.ts` → `diff-engine.test.ts`). No `__tests__` directories. Unit tests mock I/O. Integration tests use tmp filesystem, always clean up.

**No `any`:** Zero tolerance. If you need to escape the type system, use `unknown` and narrow explicitly.

**Filesystem:** Only `StoreManager` touches `~/.mexai/`. No other module reads or writes to disk directly.

**Async:** All I/O is `async/await`. No callbacks. No `.then()` chains.

---

## Critical Files

- `packages/core/src/types.ts` — every shared type, never touch without understanding full impact
- `packages/core/src/store/store-manager.ts` — single source of truth for all store operations
- `packages/core/src/diff/diff-engine.ts` — most critical business logic, highest test coverage required
- `packages/core/src/store/registry.ts` — project ↔ path mapping, workspace auto-detection
- `packages/cli/src/utils/resolve.ts` — async 5-step project resolution chain (flag → mexai.json → path match → active → interactive picker)
- `packages/mcp/src/server.ts` — MCP server entrypoint
- `packages/cli/src/index.ts` — CLI entrypoint

---

## Commands

```bash
pnpm build          # build all packages
pnpm test           # run all tests
pnpm typecheck      # tsc --noEmit across all packages
pnpm lint           # eslint across all packages
pnpm dev            # watch mode
pnpm changeset      # create a changeset
```

---

## Agent Rules

**Before writing any code:**
1. Check which package you're in — core, cli, or mcp
2. Core must never import from cli or mcp
3. Check `types.ts` before creating any new type
4. Check `schemas.ts` before creating any new validation

**When modifying the diff engine:**
- The merge rules table in the architecture doc is the spec
- Every merge rule must have a corresponding test
- Apply never writes to disk — that is StoreManager's job

**When adding a CLI command:**
- All business logic stays in core
- CLI handler calls core, formats output, returns
- Use `resolveFromOptions()` (async) for project detection — never read registry directly
- Call `writeProjectLink()` after any operation that establishes or updates a project path

**When adding an MCP tool:**
- Input validated with Zod before any core call
- All errors return typed `McpToolResult` — no raw throws
- `workspacePath` is always the first resolution attempt

**Commit format:** `type(scope): description` — scopes are `core`, `cli`, `mcp`, `tooling`, `docs`

---

## What Not To Do

- Do not add business logic to the CLI or MCP packages
- Do not read `~/.mexai/` from anywhere except StoreManager
- Do not auto-apply context changes — always write to `pending-diff.json`
- Do not add LLM API calls to core (static scan only, no AI in the scan)
- Do not break the token budget — injection must never exceed configured ceiling
- Do not skip writing tests for diff engine changes
- Do not use `any` — use `unknown` and narrow

---

## Context Files

| File | Purpose |
|---|---|
| `docs/04-About-Mexai.md` | Product description, compatibility, quick start |
| `docs/05-Architecture.md` | Canonical architecture reference |
| `docs/06-Implementation-Plan.md` | Phase-by-phase build sequence |

When in doubt about a design decision, check `05-Architecture.md` first.
The decisions log at the bottom of that file explains why each choice was made.

---

## Skills

Read the relevant skill before working on these modules:

| Skill | When to Read |
|---|---|
| `docs/skills/diff-engine-skill.md` | Before touching `packages/core/src/diff/` — covers all merge rules, test requirements, and common mistakes |
| `docs/skills/mcp-tool-skill.md` | Before adding or modifying any MCP tool — covers resolution pattern, error handling, return shape |
| `docs/skills/test-patterns-skill.md` | Before writing any test — covers co-location, tmp filesystem pattern, mocking simple-git and StoreManager |