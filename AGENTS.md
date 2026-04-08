# Mexai — Agent Context

<!-- Generated for non-MCP agents. For MCP-enabled editors, use `mexai serve` instead. -->
<!-- Last updated: see git log -->

## Rules

### Code Quality
- TypeScript strict mode always — `strict: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`
- Zero `any` tolerance — use `unknown` and narrow explicitly
- No disabled eslint rules without a comment explaining why
- Every pure function has unit tests — no exceptions
- Every exported function has JSDoc documentation

### Security
- Never log secrets, tokens, or file paths containing user home directories
- All external input (MCP tool args, CLI args, file contents) validated with Zod before use
- No eval, no dynamic require, no shell injection via user-controlled strings
- File operations scoped to `~/.mexai/` only — never write to arbitrary paths
- GitHub token read from environment only, never hardcoded or stored in registry

### Consistency
- All types in `packages/core/src/types.ts` — never duplicate
- All schemas in `packages/core/src/schemas.ts`
- StoreManager is the only module that touches the filesystem
- Errors are typed — `McpErrorCode` for MCP, `StoreError` for storage failures
- Commit format: `type(scope): description` — scopes: core, cli, mcp, tooling, docs

### Review Gates
- `pnpm typecheck` zero errors
- `pnpm lint` zero warnings
- `pnpm test` all pass
- No `any`, no skipped tests, no disabled rules
- Changeset written for any user-facing change

---

## Project

**Mexai** is a local-first context manager for AI-assisted development.

It maintains three layers per project — project context (`context.md`), codebase map (`codebase.md`), and agent rules (`rules.md`) — and injects them into every AI session in 400–700 tokens, vs 2,000–8,000 tokens for raw codebase reading.

Works via MCP (Cursor, Claude Code, VS Code, OpenCode) and flat file export (any agent).

**Stack:** TypeScript · Node.js 20+ · pnpm workspaces · Turborepo · tsup · Vitest · Zod · simple-git · Commander · MCP SDK

---

## Monorepo Structure

```
mexai/
├── packages/
│   ├── core/     # @mexai/core — domain logic, zero I/O deps
│   ├── cli/      # mexai — CLI, thin adapter over core
│   └── mcp/      # @mexai/mcp — MCP server, thin adapter over core
├── tooling/
│   ├── tsconfig/ # shared TS configs
│   └── eslint/   # shared ESLint config
└── docs/
```

**Dependency rule:** core has no internal deps. cli and mcp depend only on core.

---

## Key Decisions

- Three separate layer files (not one flat file) — different update cadence, different ownership
- AI proposes Layer 1 only — codebase map and rules are developer-owned
- Static scan only for `mexai map` — no LLM, no API key, no cost
- Token budget enforced in core — same system for MCP injection and flat file export
- `registry.json` maps project slugs to codebase paths — workspace auto-detection
- `mexai.json` written to project root on init/map/connect/link — definitive auto-detection (like `.git`), resolves ambiguous path-prefix matches
- Prefix-based path matching with `fs.realpathSync` — handles monorepos and symlinks
- Interactive project picker (inquirer list) shown when project cannot be auto-determined and TTY is available
- Manual sync only — no background daemon, trust model requires conscious pushes
- Auto-scan codebase on `mexai init` — populates draft `codebase.md` immediately, no extra step required
- AI bootstrap prompt shown after init — boxed instructions the developer pastes into their AI editor so the agent fills in full project context via `context_save`, then `mexai diff` + `mexai commit`

---

## Open Threads

- [x] Phase 1: Monorepo scaffold + foundation
- [x] Phase 2: Core engine (diff, scanner, formats, budget)
- [x] Phase 3: CLI commands (all 15 commands implemented and passing build/lint/typecheck)
- [ ] Phase 4: MCP server + workspace auto-detection
- [ ] Phase 5: GitHub sync + OSS launch

---

## Codebase Map

### Key Files
- `packages/core/src/types.ts` — all shared types, single source of truth
- `packages/core/src/schemas.ts` — all Zod schemas
- `packages/core/src/store/store-manager.ts` — all filesystem ops + mexai.json helpers (writeProjectLink, readProjectLink)
- `packages/core/src/diff/diff-engine.ts` — most critical module
- `packages/cli/src/utils/resolve.ts` — async 5-step project resolution chain (flag → mexai.json walk-up → path match → active → interactive picker)
- `packages/mcp/src/server.ts` — MCP entrypoint
- `packages/cli/src/index.ts` — CLI entrypoint

### Do Not Touch
- `dist/` — build output, never edit
- `node_modules/` — never edit
- `.changeset/` — managed by changeset CLI only

---

---

## AI Onboarding Workflow

After `mexai init`, a **bootstrap prompt** is shown in the terminal. Paste it into your AI editor (Cursor, Claude Code, etc.) to kick off the onboarding:

1. The AI reads the auto-generated codebase draft (`codebase.md`)
2. Uses `context_save` to write full project details:
   - Identity paragraph (what the project is, why it exists)
   - Current development state
   - Key architectural decisions made so far
   - Key files and their purposes
   - Code conventions and patterns
   - Files that must not be modified
3. Run `mexai diff` to review the proposed changes
4. Run `mexai commit` to apply them to the versioned context store

This flow ensures every project starts with comprehensive AI-populated context, not just the minimal details entered during `mexai init`.

---

*Context managed by Mexai. When user says "save this" or "remember this", propose updates using the context_save flow.*