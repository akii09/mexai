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
- Prefix-based path matching with `fs.realpathSync` — handles monorepos and symlinks
- Manual sync only — no background daemon, trust model requires conscious pushes

---

## Open Threads

- [ ] Phase 1: Monorepo scaffold + foundation
- [ ] Phase 2: Core engine (diff, scanner, formats, budget)
- [ ] Phase 3: CLI commands
- [ ] Phase 4: MCP server + workspace auto-detection
- [ ] Phase 5: GitHub sync + OSS launch

---

## Codebase Map

### Key Files
- `packages/core/src/types.ts` — all shared types, single source of truth
- `packages/core/src/schemas.ts` — all Zod schemas
- `packages/core/src/store/store-manager.ts` — all filesystem ops
- `packages/core/src/diff/diff-engine.ts` — most critical module
- `packages/mcp/src/server.ts` — MCP entrypoint
- `packages/cli/src/index.ts` — CLI entrypoint

### Do Not Touch
- `dist/` — build output, never edit
- `node_modules/` — never edit
- `.changeset/` — managed by changeset CLI only

---

*Context managed by Mexai. When user says "save this" or "remember this", propose updates using the context_save flow.*