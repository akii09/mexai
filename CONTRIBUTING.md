# Contributing to Mexai

Thanks for your interest in contributing. This document covers everything you need to go from zero to a merged PR.

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- Git in `PATH`

---

## Local Setup

```bash
# 1. Fork + clone
git clone https://github.com/your-username/mexai.git
cd mexai

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm build

# 4. Run tests
pnpm test

# 5. Type check
pnpm typecheck
```

If all four pass, your environment is ready.

---

## Project Structure

```
mexai/
├── packages/
│   ├── core/        # @mexai/core — all domain logic
│   ├── cli/         # mexai CLI
│   └── mcp/         # @mexai/mcp MCP server
├── tooling/
│   ├── tsconfig/    # shared TypeScript config
│   └── eslint/      # shared ESLint config
└── docs/            # architecture, implementation plan, guides
```

The most important rule: **`packages/core` has zero dependencies on `packages/cli` or `packages/mcp`**. Core is pure domain logic. CLI and MCP are thin adapters. Never import upward.

---

## Making Changes

### 1. Create a branch

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/your-bug-description
```

Branch naming: `feat/<name>`, `fix/<name>`, `docs/<name>`, `test/<name>`

### 2. Write your code

**Before writing anything, read the relevant section of `docs/05-Architecture.md`.** Every design decision is documented there. The decisions log at the bottom explains why things are the way they are.

Key rules:

- All shared types go in `packages/core/src/types.ts`
- All Zod schemas go in `packages/core/src/schemas.ts`
- Only `StoreManager` touches `~/.mexai/` — no direct filesystem access elsewhere
- Zero `any` — use `unknown` and narrow explicitly
- Every new exported function needs JSDoc

### 3. Write tests

Tests are co-located with source files:

```
packages/core/src/diff/
├── diff-engine.ts
└── diff-engine.test.ts   ← lives here, not in __tests__/
```

Rules:
- Unit tests mock all I/O — never touch real `~/.mexai/`
- Integration tests use a tmp directory — always clean up in `afterEach`
- Diff engine changes must test every affected merge rule
- Run `pnpm test` to verify before committing

### 4. Write a changeset

Every PR that changes user-facing behaviour needs a changeset:

```bash
pnpm changeset
```

Follow the prompts:
- Choose the affected packages
- Choose the bump type (patch for fixes, minor for features, major for breaking)
- Write a short description of what changed

If your PR is docs-only or tooling-only with no user-facing changes, you can skip this step.

### 5. Commit

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): add merge rule for concurrent saves
fix(cli): handle missing active project in diff command
test(mcp): add integration tests for context_save tool
docs(arch): document token budget truncation order
chore: update dependencies
```

Scopes: `core`, `cli`, `mcp`, `tooling`, `docs`

Commits are linted by `commitlint` on every commit. A bad format will be rejected.

### 6. Open a PR

Before opening, run the full check locally:

```bash
pnpm typecheck   # zero errors
pnpm lint        # zero warnings
pnpm build       # all packages build
pnpm test        # all tests pass
```

PR title follows the same format as commits: `feat(core): description`

In the PR description, explain:
- What changed and why
- Any design decisions made
- How to test it manually if relevant

---

## PR Checklist

Before requesting review:

- [ ] Code follows the architecture doc — no deviations without discussion
- [ ] All types are in `types.ts`, all schemas in `schemas.ts`
- [ ] No `any` anywhere in new code
- [ ] New functions have JSDoc
- [ ] Tests written for all new business logic
- [ ] Diff engine changes have tests for every affected merge rule
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] Changeset written (if user-facing)
- [ ] Conventional commit format used

---

## What Gets Merged

Good PRs:
- Fix a real bug with a test that proves the fix
- Add a feature that's in the implementation plan
- Improve documentation with accurate information
- Add tests that increase coverage meaningfully

PRs that won't be merged:
- Add `any` to escape type complexity
- Add business logic to CLI or MCP packages
- Skip tests for "just a small change"
- Add dependencies without a discussion issue first
- Break the token budget guarantee

---

## Questions

Open an issue before starting work on anything larger than a bug fix. It avoids wasted effort if the approach doesn't fit the architecture.

If you're unsure whether something is in scope, check `docs/06-Implementation-Plan.md` — the non-goals section explicitly lists what's deferred.

---

## Code of Conduct

Be direct, be constructive, be respectful. Focus feedback on the code, not the person.