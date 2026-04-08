# Mexai — Implementation Plan

**Version:** 1.0  
**Status:** Active  
**License:** MIT  

---

## Overview

This document is the build sequence for Mexai v1. It is organised into five phases, each producing a shippable increment. Every phase has clear entry criteria, a defined deliverable, and explicit exit criteria. Nothing moves to the next phase until the current one passes its exit criteria.

**Total estimated timeline: 12–15 weeks** for a single developer working part-time (~15–20 hrs/week). Full-time compresses this to 6–8 weeks.

---

## Phases at a Glance

| Phase | Name | Weeks | Deliverable |
|---|---|---|---|
| 1 | Foundation | 1–2 | Monorepo scaffold, types, schemas, store, git |
| 2 | Core Engine | 3–5 | Layer formats, diff engine, scanner, token budget |
| 3 | CLI | 6–8 | All commands working end-to-end against real store |
| 4 | MCP Server | 9–11 | All tools working, workspace auto-detection live |
| 5 | Sync + Polish | 12–15 | GitHub sync, flat file export, OSS launch prep |

Each phase builds strictly on the previous. No phase starts until the previous one's tests pass.

---

## Phase 1 — Foundation

**Goal:** A working monorepo with the complete type system, Zod schemas, store manager, and git wrapper. No business logic yet — just the skeleton everything else plugs into.

**Why first:** Every other module depends on types, schemas, and the store. Building these first means Phase 2 never touches infrastructure — it only writes business logic.

### 1.1 Monorepo Scaffold

Set up the workspace with all tooling locked in before writing a single line of product code.

```
Tasks:
□ pnpm workspace init with three packages: core, cli, mcp
□ turbo.json pipeline: build → test → lint → typecheck → dev
□ tooling/tsconfig/base.json with all strict flags enabled
□ tooling/eslint/ shared config
□ Root package.json scripts: build, test, lint, typecheck, dev, changeset, release
□ .changeset/ directory init
□ .github/workflows/ci.yml — PR checks (typecheck, lint, build, test)
□ .github/workflows/release.yml — changeset publish on main merge
□ tsup configs for core (cjs+esm+dts) and cli (cjs only, shebang)
□ Vitest configs per package
□ commitlint + husky for conventional commits
□ Root README.md (minimal — links to docs)
□ CONTRIBUTING.md
□ LICENSE (MIT)
```

**Exit criteria:** `pnpm build` passes across all packages. `pnpm test` runs (no tests yet, but runner works). CI workflow runs on a test PR.

---

### 1.2 Type System

All types in `packages/core/src/types.ts`. Written once, never duplicated.

```
Tasks:
□ Primitive types: ContextSource, ProjectStatus, Layer
□ Layer 1 types: ContextFrontmatter, DecisionEntry, ThreadEntry, ParsedContext
□ Layer 2 types: ParsedCodebase
□ Layer 3 types: ParsedRules
□ Proposal types: ProposedDecision, ProposedThread, ContextChanges, CodebaseChanges
□ PendingDiff + DiffPreview
□ Scanner types: CodebaseScanResult, DirectoryNode
□ Registry types: MexaiRegistry, RegistryEntry
□ Config types: MexaiConfig
□ Sync types: SyncPushResult, SyncPullResult, ConflictReport, SyncStatus
□ Result types: ApplyResult, InjectionPayload, ProjectSummary, GitLogEntry
□ McpToolResult + McpErrorCode
```

**Exit criteria:** `tsc --noEmit` passes with zero errors. No `any` anywhere.

---

### 1.3 Zod Schemas

`packages/core/src/schemas.ts`. Every external input validated before touching the store.

```
Tasks:
□ ContextFrontmatterSchema (validates YAML frontmatter fields + types)
□ DecisionEntrySchema
□ ThreadEntrySchema
□ ProposedDecisionSchema
□ ProposedThreadSchema
□ PendingDiffSchema
□ MexaiConfigSchema (with defaults)
□ MexaiRegistrySchema
□ InitOptionsSchema (CLI init inputs)
□ All MCP tool input schemas (context_read, context_save, codebase_read, rules_read, context_list)
□ Unit tests: valid inputs pass, invalid inputs throw with descriptive messages
```

**Exit criteria:** All schemas have passing unit tests. Schema tests run in < 500ms total.

---

### 1.4 Store Manager

`packages/core/src/store/store-manager.ts`. The single module that touches `~/.mexai/`.

```
Tasks:
□ ensureStore() — creates ~/.mexai/, projects/, config.json, registry.json if missing
□ initProject() — creates project directory, writes empty layer files, inits git, registers path
□ getProject() — reads project metadata from context.md frontmatter
□ listProjects() — returns ProjectSummary[] from all slugs in registry
□ registerPath() — writes path entry to registry.json (called by init)
□ linkPath() — updates existing registry entry (called by mexai link)
□ resolveProject() — full resolution chain:
    1. workspacePath prefix match against registry
    2. stale path recovery (folder name heuristic, surfaces error message only)
    3. active fallback
    4. NO_ACTIVE_PROJECT error
□ getActive() / setActive() — reads/writes ~/.mexai/active
□ readLayer() / writeLayer() — reads/writes context.md, codebase.md, rules.md
□ readPendingDiff() / writePendingDiff() / clearPendingDiff() — pending-diff.json CRUD
□ Integration tests with tmp filesystem (setup + teardown per test)
```

**Exit criteria:** All StoreManager methods have integration tests covering happy paths and error cases. No test touches the real `~/.mexai/`.

---

### 1.5 Config Manager

`packages/core/src/store/config-manager.ts`.

```
Tasks:
□ read() — reads config.json, merges with defaults if missing fields
□ write() — writes config.json
□ getTokenBudget() — returns budget with defaults applied
□ Unit tests: missing config returns defaults, partial config merges correctly
```

---

### 1.6 Git Wrapper

`packages/core/src/git/git-wrapper.ts`. Thin abstraction over `simple-git`.

```
Tasks:
□ init(projectPath) — git init on the project store directory
□ commit(projectPath, message) — stage all + commit with message
□ log(projectPath, n) — returns GitLogEntry[]
□ restore(projectPath, hash) — checkout specific hash
□ isDirty(projectPath) — returns true if uncommitted changes exist
□ Unit tests: mock simple-git, test all methods
```

**Phase 1 Exit Criteria:**
- `pnpm build` passes
- `pnpm test` passes (all schema + store + git tests)
- `pnpm typecheck` zero errors
- `pnpm lint` zero warnings
- No `any`, no disabled eslint rules, no skipped tests

---

## Phase 2 — Core Engine

**Goal:** Complete `@mexai/core` — layer formats, diff engine, codebase scanner, injection composer, export engine, token budget system. At the end of this phase, the entire domain works in isolation and is fully tested.

**Why before CLI/MCP:** The CLI and MCP server are thin adapters. They cannot be built correctly until the core they wrap is stable and tested.

### 2.1 Layer Format Modules

Three modules, same pattern: parse markdown → typed struct, serialize typed struct → markdown, format for injection (token-aware truncation).

**`context-format.ts` (Layer 1):**
```
Tasks:
□ parse(raw: string): ParsedContext — YAML frontmatter + section extraction
□ serialize(ctx: ParsedContext): string — rebuild markdown from struct
□ formatForInjection(ctx: ParsedContext, budget: number): string
□ Truncation rules:
    - Identity: never truncated
    - Current State: never truncated
    - Decisions: oldest removed first
    - Open Threads: resolved removed first, then oldest unresolved
□ Unit tests:
    - parse → serialize roundtrip (output equals input)
    - edge cases: empty sections, very long decisions, unicode, missing frontmatter fields
    - truncation: correct priority order, stays within budget
```

**`codebase-format.ts` (Layer 2):**
```
Tasks:
□ parse(raw: string): ParsedCodebase
□ serialize(cb: ParsedCodebase): string
□ formatForInjection(cb: ParsedCodebase, budget: number): string
□ Truncation rules:
    - Key Files: never truncated
    - Conventions: never truncated
    - Structure tree: deepest levels removed first
    - Patterns: oldest removed first
□ Unit tests: same pattern as context-format
```

**`rules-format.ts` (Layer 3):**
```
Tasks:
□ parse(raw: string): ParsedRules
□ serialize(rules: ParsedRules): string
□ formatForInjection(rules: ParsedRules, budget: number): string
□ Rules never truncated — warn if over budget
□ Unit tests: roundtrip, over-budget warning
```

---

### 2.2 Token Budget Calculator

`packages/core/src/budget.ts`. Used by all format modules and the injection composer.

```
Tasks:
□ estimateTokens(text: string): number — Math.ceil(text.length / 4)
□ isWithinBudget(text: string, ceiling: number): boolean
□ trimTobudget(sections: BudgetSection[], ceiling: number): string
    — sections have priority order, lowest priority trimmed first
□ Unit tests:
    - known inputs produce expected token counts
    - trimToBudget respects priority order
    - trimToBudget never exceeds ceiling
```

---

### 2.3 Diff Engine

`packages/core/src/diff/diff-engine.ts` + `diff-merger.ts`. The most critical module.

```
Tasks:
□ DiffEngine.build(proposed, source): PendingDiff
    - creates new PendingDiff with preview populated
□ DiffEngine.merge(existing, incoming, source): PendingDiff
    - merge rules:
      decisions: append (no dedup)
      openThreads add: dedup by content
      openThreads check_off + pending add: net-zero (cancel both)
      currentState: last write wins
      sources: union dedup
    - updates preview counts
□ DiffEngine.apply(current: ParsedContext, diff: PendingDiff): ApplyResult
    - never writes to disk
    - returns updated content + human-readable summary
□ Unit tests (these are the most important tests in the entire codebase):
    - build: produces correct PendingDiff structure
    - merge: decisions append correctly
    - merge: openThreads dedup by content
    - merge: net-zero cancellation (check_off + add same content)
    - merge: currentState last write wins
    - merge: sources union dedup
    - apply: decisions appended to correct section
    - apply: openThreads checked off correctly
    - apply: currentState replaced correctly
    - apply: idempotent (applying same diff twice is safe)
    - concurrent saves (3 saves before commit — all merge correctly)
```

---

### 2.4 Codebase Scanner

`packages/core/src/scanner/codebase-scanner.ts`.

```
Tasks:
□ scan(projectRoot: string): Promise<CodebaseScanResult>
    - Directory tree walk (3 levels, excludes: node_modules, .git, dist, build, .next, .turbo, coverage)
    - package.json read (name, dependencies, devDependencies, scripts)
    - tsconfig.json read (strict mode flags)
    - Framework detection heuristics:
        Next.js: next in deps OR next.config.* exists
        Vite: vite in devDeps OR vite.config.* exists
        Express: express in deps
        Remix: @remix-run/* in deps
        Astro: astro in deps
    - Test framework detection:
        Vitest: vitest in devDeps
        Jest: jest in devDeps
    - Styling detection:
        Tailwind: tailwindcss in devDeps OR tailwind.config.* exists
        CSS Modules: *.module.css files exist
        styled-components: styled-components in deps
□ generateDraft(result: CodebaseScanResult): string
    - outputs structured codebase.md draft
    - marks clearly as "DRAFT — review before using"
    - populates Structure from directory tree
    - populates Conventions stubs based on detected stack
    - leaves Patterns + Do Not Touch as empty stubs for developer
□ Unit tests with mock filesystem:
    - Next.js + Tailwind project detected correctly
    - Vite + React project detected correctly
    - plain Node.js project detected correctly
    - empty project (no package.json) handled gracefully
    - generateDraft output is valid codebase.md (parseable by codebase-format.ts)
```

---

### 2.5 Injection Composer

`packages/core/src/injection/injection-composer.ts`.

```
Tasks:
□ compose(slug, opts: ComposeOptions): Promise<InjectionPayload>
    - reads requested layers from store
    - parses each layer
    - formats each for injection within its budget ceiling
    - assembles final text in correct order: rules → context → codebase
    - returns text + tokensUsed + layerBreakdown
□ Unit tests:
    - all three layers compose correctly within total budget
    - single layer requests work
    - over-budget layer truncates, does not exceed ceiling
    - layerBreakdown sums to tokensUsed
```

---

### 2.6 Export Engine

`packages/core/src/export/export-engine.ts`.

```
Tasks:
□ exportAgentsMd(slug): Promise<string> — AGENTS.md format
□ exportClaudeMd(slug): Promise<string> — CLAUDE.md format (no MCP instructions)
□ exportCursorRules(slug): Promise<string> — .cursorrules (rules-focused)
□ All exports:
    - respect token budget
    - include generated-by header with timestamp
    - include "do not edit directly" warning
□ Unit tests:
    - output includes correct sections for each format
    - output respects token ceiling
    - output parses as valid markdown
```

---

### 2.7 Sync Manager

`packages/core/src/sync/sync-manager.ts`.

```
Tasks:
□ initRemote(slug, repoName, visibility) — creates GitHub repo via API + initial push
□ cloneRemote(url, slug, localPath) — pulls remote into local store + registers path
□ push(slug): Promise<SyncPushResult>
□ pull(slug): Promise<SyncPullResult> — detects conflicts, returns ConflictReport[]
□ sync(slug) — pull then push
□ status(slug): Promise<SyncStatus>
□ Integration tests with mock git remote:
    - push succeeds when remote exists
    - push fails gracefully when no remote registered
    - pull detects conflict correctly
    - pull reports conflict without corrupting local state
    - sync is pull-first (local never overwritten without pull attempt)
```

**Phase 2 Exit Criteria:**
- All core modules have passing unit + integration tests
- `pnpm test` for `@mexai/core` passes in < 30 seconds
- Zero `any`, zero skipped tests
- `pnpm build` produces valid CJS + ESM + `.d.ts` for core
- Every module's public API matches the architecture doc exactly

---

## Phase 3 — CLI

**Goal:** All `mexai` commands working end-to-end against a real local store. A developer can install the CLI, run `mexai init`, `mexai map`, `mexai connect`, `mexai diff`, `mexai commit`, and have a fully functioning local context workflow.

**Why before MCP:** The CLI is the primary interface for context management. Getting it right first means the MCP server only has to expose what already works.

### 3.1 CLI Scaffold

```
Tasks:
□ Commander.js setup with top-level program
□ chalk + ora for output formatting
□ Error handler: typed errors → formatted terminal output with correct prefix (✓ → ! ✗)
□ Global --help formatting
□ Version flag reads from package.json
□ Binary entrypoint with shebang via tsup banner
```

---

### 3.2 `mexai init`

```
Tasks:
□ Interactive mode (default):
    - Detect cwd as project root
    - Prompt: project name (default: folder name)
    - Prompt: domain
    - Prompt: tech stack (comma-separated)
    - Prompt: identity (2-3 sentences)
    - Prompt: current state
    - Prompt: rules setup (Y/n)
      → Y: open $EDITOR with rules template, wait for save
      → n: copy starter rules template
    - Call StoreManager.initProject()
    - Call StoreManager.registerPath()
    - Show success output with next steps
□ Non-interactive mode (-y flag):
    - Accept --name, --stack, --domain flags
    - Skip all prompts, use defaults
    - Show success output
□ Starter rules template (embedded in CLI package)
□ Integration test: init in tmp dir produces correct store structure
```

---

### 3.3 `mexai map`

```
Tasks:
□ Detect project from cwd (resolveProject)
□ Run CodebaseScanner.scan() against cwd
□ Show scan summary (frameworks detected, file count, config files found)
□ Write draft to ~/.mexai/projects/<slug>/codebase.md
□ Show next step: mexai edit --layer codebase
□ Integration test: scan produces parseable codebase.md
```

---

### 3.4 `mexai connect`

```
Tasks:
□ Supported agents: cursor, claude-code, vscode, opencode
□ MCP config locations per agent:
    cursor:      ~/.cursor/mcp.json
    claude-code: ~/.claude/mcp.json  (or project-level .mcp.json)
    vscode:      .vscode/mcp.json in cwd
    opencode:    ~/.opencode/mcp.json
□ Merge strategy: read existing config, add mexai entry, write back
    (never overwrite other entries)
□ Export flat files to cwd: AGENTS.md + CLAUDE.md + .cursorrules
□ Show per-agent restart instructions
□ Integration test: each agent config written correctly + merged with existing
```

---

### 3.5 `mexai diff`

```
Tasks:
□ Detect project from cwd
□ Read pending-diff.json
□ Render framed diff block (decisions added, threads resolved, current state changed)
□ Show commit + discard commands as next steps
□ --discard flag: confirm prompt → clearPendingDiff()
□ No pending diff: show "No pending changes." message
□ Integration test: diff output matches expected format for known PendingDiff
```

---

### 3.6 `mexai commit`

```
Tasks:
□ Detect project from cwd
□ Read pending-diff.json — error if none
□ Apply diff to current context.md via DiffEngine.apply()
□ Write updated context.md via StoreManager.writeLayer()
□ Git commit via GitWrapper.commit()
□ Clear pending-diff.json
□ Show success with commit hash
□ Integration test: full init → context_save → commit cycle produces correct context.md
```

---

### 3.7 `mexai link`

```
Tasks:
□ Interactive mode (no args):
    - List all known projects
    - Prompt: which project does this directory belong to?
    - Call StoreManager.linkPath()
□ Non-interactive: mexai link <path> --project <slug>
□ Validate: path exists on disk
□ Validate: slug exists in store
□ Integration test: link updates registry.json correctly
```

---

### 3.8 `mexai load`

```
Tasks:
□ Accept slug argument
□ Validate slug exists
□ Call StoreManager.setActive()
□ Show confirmation
```

---

### 3.9 `mexai list`

```
Tasks:
□ Call StoreManager.listProjects()
□ Table output: slug, name, path, status, last updated, has pending diff
□ Active project marked with ❯
```

---

### 3.10 `mexai status`

```
Tasks:
□ Detect project from cwd (or active fallback)
□ Show: active project name + path
□ Show: remote (if registered)
□ Show: layer status (pending diff, up to date)
□ Show: merge conflicts if present
□ Show: last synced timestamp if remote exists
□ Integration test: status output correct for known store state
```

---

### 3.11 `mexai log`

```
Tasks:
□ Detect project from cwd
□ Call GitWrapper.log()
□ -n flag for count (default 10)
□ Formatted output: hash, relative date, message
```

---

### 3.12 `mexai restore`

```
Tasks:
□ Accept hash argument
□ Confirm prompt (destructive operation)
□ Call GitWrapper.restore()
□ Show success
```

---

### 3.13 `mexai edit`

```
Tasks:
□ --layer flag: context | codebase | rules (default: context)
□ Resolve layer file path
□ Open in $EDITOR (fallback: $VISUAL, fallback: vi)
□ Wait for editor to close
□ Show "saved" confirmation
```

---

### 3.14 `mexai export`

```
Tasks:
□ Detect project from cwd
□ Call ExportEngine for all three formats
□ Write AGENTS.md, CLAUDE.md, .cursorrules to cwd
□ Show token count per file
```

---

### 3.15 `mexai sync` (CLI wiring only — logic in Phase 5)

```
Tasks:
□ Register command with subcommands: --init, --clone, --push, --pull, --status
□ Wire to SyncManager methods
□ Output formatting per subcommand
□ (Full sync integration tests in Phase 5)
```

**Phase 3 Exit Criteria:**
- All commands work end-to-end against a real tmp store
- `mexai init` → `mexai map` → `mexai connect cursor` → `mexai status` runs without errors
- Integration test covering the full solo dev workflow passes
- CLI binary installs correctly via `npm install -g` (test in clean environment)

---

## Phase 4 — MCP Server

**Goal:** `@mexai/mcp` fully working. All five tools tested. Workspace auto-detection live. An agent opening a registered project gets the right context automatically.

### 4.1 MCP Server Scaffold

```
Tasks:
□ McpServer instantiation with name + version
□ StdioServerTransport setup
□ Graceful shutdown handling (SIGTERM, SIGINT)
□ Error boundary: no raw throws escape tool handlers
□ mexai serve command wires to this server
```

---

### 4.2 `context_read` Tool

```
Tasks:
□ Input schema: workspacePath?, slug?, layers?, maxTokens?
□ Resolution logic:
    1. explicit slug
    2. workspacePath → resolveProject()
    3. active fallback
    4. NO_ACTIVE_PROJECT error
□ Load requested layers via StoreManager
□ Compose injection payload via InjectionComposer
□ Return: { success: true, content, tokensUsed }
□ Integration tests:
    - workspacePath for registered project → correct context returned
    - workspacePath for sub-directory of registered project → correct context returned
    - workspacePath for unknown path → NO_ACTIVE_PROJECT
    - explicit slug overrides workspacePath
    - maxTokens respected
    - layers filter works (context only, codebase only, etc.)
```

---

### 4.3 `context_save` Tool

```
Tasks:
□ Input schema: workspacePath?, slug?, source, commitMessage, sessionNote?, changes
□ Validate: source is known ContextSource
□ Validate: commitMessage max 72 chars
□ Resolve project via resolution chain
□ If no pending diff exists: DiffEngine.build()
□ If pending diff exists: DiffEngine.merge()
□ Write to pending-diff.json via StoreManager
□ Return: { success: true, preview } — summary of what was staged
□ Integration tests:
    - first save creates pending-diff.json
    - second save before commit merges correctly (all merge rules)
    - decisions append
    - threads dedup
    - currentState last-write-wins
    - invalid input rejected with VALIDATION_ERROR
```

---

### 4.4 `codebase_read` Tool

```
Tasks:
□ Input schema: workspacePath?, slug?, section?
□ Resolve project
□ Read codebase.md via StoreManager
□ Parse via codebase-format.ts
□ If section specified: return only that section
□ If section = 'all' (default): return full formatted map within budget
□ Integration tests:
    - full codebase returned for 'all'
    - section filtering returns correct section only
    - missing codebase.md returns LAYER_NOT_INITIALIZED
```

---

### 4.5 `rules_read` Tool

```
Tasks:
□ Input schema: workspacePath?, slug?
□ Resolve project
□ Read + return rules.md content
□ Integration tests:
    - returns rules for active project
    - missing rules.md returns LAYER_NOT_INITIALIZED
```

---

### 4.6 `context_list` Tool

```
Tasks:
□ No input schema (empty object)
□ Call StoreManager.listProjects()
□ Return formatted list with active marker
□ Integration test: returns all projects with correct active flag
```

---

### 4.7 MCP Resources

```
Tasks:
□ Register four resources:
    mexai://context   → Layer 1 formatted at 250 token ceiling
    mexai://codebase  → Layer 2 formatted at 300 token ceiling
    mexai://rules     → Layer 3 formatted at 150 token ceiling
    mexai://all       → All three layers at 700 token ceiling
□ Resources resolve active project via resolveProject() with no workspacePath
    (resource injection doesn't pass workspace — uses active project)
□ Integration tests:
    - each resource URI returns correct layer content
    - mexai://all stays within 700 token ceiling
```

---

### 4.8 End-to-End MCP Integration Test

The most important test in Phase 4.

```
Tasks:
□ Spawn mexai serve as subprocess
□ Connect via stdio MCP client
□ Register a test project in tmp store
□ Call context_read → assert correct project identified by workspacePath
□ Call context_save with decisions + threads
□ Call context_read again → assert pending diff noted in response
□ Call codebase_read → assert codebase layer returned
□ Call rules_read → assert rules layer returned
□ Call context_list → assert test project in list
□ Shut down server cleanly
```

**Phase 4 Exit Criteria:**
- All five MCP tools have passing integration tests
- End-to-end subprocess test passes
- `mexai connect cursor` writes correct MCP config pointing to `mexai serve`
- Workspace auto-detection confirmed working: open registered project path → correct context returned, no manual steps

---

## Phase 5 — Sync, Polish, OSS Launch

**Goal:** GitHub sync working. Flat file export complete. All rough edges sanded. Ready to publish to npm and open source.

### 5.1 GitHub Sync

```
Tasks:
□ mexai sync --init:
    - Prompt: repo name (default: <project>-mexai)
    - Prompt: visibility (public/private)
    - Create GitHub repo via GitHub API (requires GITHUB_TOKEN in env)
    - Push ~/.mexai/projects/<slug>/ to new remote
    - Update registry.json with remote URL
□ mexai sync --clone <url>:
    - Pull remote into ~/.mexai/projects/<slug>/
    - Register local path
    - Show next steps (mexai map to generate local codebase scan)
□ mexai sync --push:
    - git push to registered remote
    - Surface push errors clearly (no remote, auth failure, etc.)
□ mexai sync --pull:
    - git pull from registered remote
    - Detect conflicts via SyncManager.pull()
    - Report ConflictReport[] via mexai status
    - Never leave silent git conflict markers
□ mexai sync (default):
    - pull then push
□ mexai sync --status:
    - Show localAhead / remoteAhead counts
    - Show last synced timestamp
    - Show conflict count if any
□ Integration tests:
    - push/pull against real bare git repo (local, not GitHub API)
    - conflict detection surfaces correctly
    - pull-first order enforced in sync default
```

---

### 5.2 Flat File Export Polish

```
Tasks:
□ AGENTS.md: verify format matches spec exactly
□ CLAUDE.md: strip MCP-specific instructions, add Claude-specific guidance
□ .cursorrules: rules-focused, under 150 token ceiling
□ All exports include generated-by header + last updated timestamp
□ mexai export shows token count per output file
□ Verify outputs work correctly when pasted into:
    - Claude.ai (manual test)
    - Cursor (manual test via .cursorrules)
```

---

### 5.3 Error Handling Audit

```
Tasks:
□ Walk every CLI command — every error path has a clear, actionable message
□ Walk every MCP tool — every error returns typed McpErrorCode
□ No raw Error() throws in any public-facing path
□ STORE_ERROR wraps all unexpected fs errors
□ Specific messages for common failures:
    - "No project found — run `mexai init` or `mexai link`"
    - "No pending changes to commit"
    - "Layer not initialized — run `mexai map`"
    - "Remote not configured — run `mexai sync --init`"
```

---

### 5.4 Token Budget Validation

```
Tasks:
□ Run mexai status with an over-budget rules.md — warning appears
□ Verify injection never exceeds 700 tokens regardless of content size
□ Stress test: 10,000 word context.md → truncates correctly, still under budget
□ Verify AGENTS.md export stays within configured ceiling
```

---

### 5.5 OSS Launch Checklist

```
Tasks:
□ README.md: complete with install, quick start, CLI reference, compatibility table
□ docs/ directory:
    - 01-quick-start.md
    - 02-cli-reference.md
    - 03-mcp-integration.md
    - 04-team-sync.md
    - 05-token-budget.md
□ CONTRIBUTING.md: local setup, running tests, changeset workflow, PR checklist
□ Issue templates: bug report, feature request
□ Pull request template
□ GitHub Actions CI verified green on clean clone
□ npm publish dry-run: `pnpm changeset publish --dry-run`
□ Test install from npm in clean environment: `npm install -g mexai`
□ mexai init → mexai map → mexai connect cursor → full session test
□ Version: 0.1.0 (first public release)
□ Changeset: initial release changeset written
□ GitHub release: tag v0.1.0, write release notes
```

**Phase 5 Exit Criteria:**
- `npm install -g mexai` works in clean environment
- Full workflow test passes: init → map → connect → session → diff → commit → sync
- All docs written and accurate
- Zero open bugs in launch checklist
- CI green on main

---

## Dependency Map

What each phase strictly requires from previous phases:

```
Phase 1 (Foundation)
  └── no dependencies

Phase 2 (Core Engine)
  └── requires Phase 1: types, schemas, store, git wrapper

Phase 3 (CLI)
  └── requires Phase 2: all core modules complete and tested

Phase 4 (MCP Server)
  └── requires Phase 2: core modules
  └── requires Phase 3: mexai serve command (CLI wiring)

Phase 5 (Sync + Polish)
  └── requires Phase 3: CLI fully working
  └── requires Phase 4: MCP fully working
```

---

## External Dependencies

All dependencies are locked at project init. No new dependencies added after Phase 1 without a decision log entry.

| Package | Used In | Purpose |
|---|---|---|
| `simple-git` | core | Git operations |
| `zod` | core | Schema validation |
| `gray-matter` | core | YAML frontmatter parsing |
| `@modelcontextprotocol/sdk` | mcp | MCP server + tools |
| `commander` | cli | Command parsing |
| `inquirer` | cli | Interactive prompts |
| `chalk` | cli | Terminal colours |
| `ora` | cli | Spinner / progress |
| `turbo` | tooling | Monorepo build pipeline |
| `tsup` | tooling | TypeScript bundler |
| `vitest` | tooling | Test runner |
| `@changesets/cli` | tooling | Versioning + publish |
| `commitlint` | tooling | Commit message linting |
| `husky` | tooling | Git hooks |

---

## Non-Goals for v1

These are explicitly out of scope. Recording them prevents scope creep.

| Feature | Why Deferred |
|---|---|
| Auto-sync daemon | Breaks trust model, high complexity |
| Git diff → auto context extraction | LLM dependency, latency, cost |
| Per-user branches in sidecar | Too much friction for context updates |
| LLM conflict resolution | Unreviewed AI writes — against core principle |
| E2E tests | High setup cost, unit + integration sufficient for v1 |
| VS Code extension | Post-CLI-stable, separate package |
| Web dashboard | Not a dev tool concern in v1 |
| Access control | GitHub permissions handle this |
| Windows support | Path handling complexity — v2 |

---

## Definition of Done

A feature is done when:

1. Implementation matches the architecture doc spec exactly
2. Unit tests cover all pure functions
3. Integration tests cover all I/O operations
4. `pnpm typecheck` passes with zero errors
5. `pnpm lint` passes with zero warnings
6. Public API is documented (JSDoc on exported functions/classes)
7. Changeset written if user-facing behaviour changed