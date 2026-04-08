# Mexai — Architecture

**Version:** 1.0  
**Status:** Canonical Reference  
**License:** MIT  

---

## Table of Contents

1. [Principles](#1-principles)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Package Responsibilities](#3-package-responsibilities)
4. [The Three-Layer Model](#4-the-three-layer-model)
5. [Storage Design](#5-storage-design)
6. [Core Domain Design](#6-core-domain-design)
7. [MCP Server Design](#7-mcp-server-design)
8. [CLI Design](#8-cli-design)
9. [Flat File Export Design](#9-flat-file-export-design)
10. [Token Budget System](#10-token-budget-system)
11. [Type System](#11-type-system)
12. [Testing Strategy](#12-testing-strategy)
13. [Build System](#13-build-system)
14. [OSS Conventions](#14-oss-conventions)
15. [Decisions Log](#15-decisions-log)

---

## 1. Principles

These are the load-bearing decisions. Every implementation choice flows from them.

**Local-first, always.** The store lives at `~/.mexai/`. Nothing requires a network connection. GitHub sync is opt-in and additive — it never becomes a dependency for core functionality.

**Three layers, not one flat file.** Project context, codebase map, and agent rules have different update frequencies, different owners, and different injection strategies. Conflating them into a single file makes each one worse.

**AI proposes, human approves.** No layer is ever mutated without the developer reviewing a diff and explicitly committing. This is not a limitation — it is the trust model that makes the tool safe to use on real projects.

**Token budget is a first-class constraint.** Every layer has a defined token ceiling. The injection system is designed around staying inside the budget, not hoping it fits. Predictable cost beats flexible cost.

**Portable by default.** Every project must work without MCP via exported flat files. MCP is the preferred path but never the only path. This means the tool works with every AI agent that exists today and every agent that will exist tomorrow.

**Pure core, thin adapters.** Business logic lives in `@mexai/core` with zero I/O dependencies. The CLI and MCP server are thin adapters over the core. This keeps the core testable in isolation and makes future adapters (VS Code extension, Electron app) straightforward to add.

**OSS-grade from day one.** Strict TypeScript, documented public APIs, conventional commits, changeset-based releases, CI on every PR. No "clean this up later."

**Zero friction context switching.** Opening a project in an editor is the only action required to activate its context. The registry maps codebase paths to projects automatically. `mexai load` exists but should rarely be needed.

---

## 2. Monorepo Structure

```
mexai/
├── packages/
│   ├── core/                    # @mexai/core — pure domain logic
│   ├── cli/                     # mexai — CLI entry point
│   └── mcp/                     # @mexai/mcp — MCP server
├── tooling/
│   ├── tsconfig/                # Shared TypeScript configs
│   └── eslint/                  # Shared ESLint config
├── .changeset/                  # Changesets for versioning
├── turbo.json                   # Turborepo pipeline
├── package.json                 # Root workspace
└── pnpm-workspace.yaml          # pnpm workspaces
```

### Package Dependency Graph

```
mexai (cli)
    └── @mexai/core

@mexai/mcp
    └── @mexai/core

@mexai/core
    └── (zero internal deps — only external libraries)
```

The core package has no dependency on the CLI or MCP server. This is enforced by the monorepo structure and verified in CI.

---

## 3. Package Responsibilities

### `@mexai/core`

The domain engine. Pure TypeScript. No filesystem I/O beyond what is explicitly injected via interfaces. No CLI concerns. No MCP protocol concerns.

Owns:
- All type definitions
- File format parsing and serialization (context, codebase, rules)
- Diff engine (build, merge, apply)
- Codebase scanner (static analysis, map generation)
- Store manager (CRUD for all three layers)
- Git wrapper (commit, log, restore)
- Token budget calculator
- Export engine (AGENTS.md, CLAUDE.md, .cursorrules composition)
- Flat file injection composer
- Zod schemas for all data shapes

Does not own:
- CLI argument parsing
- MCP protocol handling
- Process management
- Network requests

### `mexai` (cli)

The developer-facing interface. Thin wrapper over `@mexai/core`.

Owns:
- Commander-based command registration
- Interactive prompts (init wizard, map review)
- Terminal output formatting (chalk, ora)
- Editor config detection and path resolution
- Entry point binary

Does not own:
- Any business logic
- Data persistence
- Schema validation

### `@mexai/mcp`

The MCP server. Thin adapter over `@mexai/core` that speaks the Model Context Protocol.

Owns:
- MCP server instantiation and lifecycle
- Tool registration (`context_read`, `context_save`, `context_list`, `codebase_read`, `rules_read`)
- Resource registration (`mexai://context`, `mexai://codebase`, `mexai://rules`, `mexai://all`)
- Input validation (Zod — all tool inputs validated before touching core)
- stdio transport management

Does not own:
- Any business logic
- Storage
- Token budget logic (delegated to core)

---

## 4. The Three-Layer Model

Mexai manages three distinct layers per project. Each has a defined purpose, update frequency, ownership model, and token ceiling.

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: PROJECT CONTEXT        context.md             │
│  What you're building, current state, key decisions     │
│  Token ceiling: 250                                     │
│  Update frequency: Every few sessions                   │
│  Owner: AI proposes, developer approves                 │
├─────────────────────────────────────────────────────────┤
│  Layer 2: CODEBASE MAP           codebase.md            │
│  Structure, conventions, patterns, key files            │
│  Token ceiling: 300                                     │
│  Update frequency: Rarely (major refactors only)        │
│  Owner: Developer documents, AI can refine              │
├─────────────────────────────────────────────────────────┤
│  Layer 3: AGENT RULES            rules.md               │
│  Quality gates, non-negotiables, anti-patterns          │
│  Token ceiling: 150                                     │
│  Update frequency: Almost never                         │
│  Owner: Developer owns entirely                         │
└─────────────────────────────────────────────────────────┘
Total ceiling: 700 tokens
```

### Why Separate Files

Each layer has a different update cadence. Merging them into one file means every AI update proposal touches the entire document — creating noise, merge conflicts, and review fatigue. Separate files mean:

- AI proposals only touch `context.md` (Layer 1)
- Developer edits `codebase.md` after a refactor without touching context
- `rules.md` is stable and almost never changes

### Layer 1: Project Context (`context.md`)

Four sections with explicit semantics:

```markdown
---
name: My Project
slug: my-project
format_version: 1
domain: open-source / dev tool
stack: [TypeScript, Node.js, React]
status: active
created_at: "2026-01-01"
last_updated: "2026-04-08"
---

## Identity
[2-3 sentences: what this project is]

## Current State
[50-150 words: what is happening now, what is blocked]

## Decisions
[Append-only log, newest first]
- **Decision title** (YYYY-MM-DD, via <source>): Reason. What was ruled out.

## Open Threads
[Running list of unresolved items]
- [ ] Item not yet done
- [x] Item resolved (YYYY-MM-DD)
```

### Layer 2: Codebase Map (`codebase.md`)

```markdown
## Structure
[Annotated folder tree — key directories with one-line purpose]

## Conventions
[How this codebase handles: errors, naming, state, styling, testing]

## Key Files
[Files an agent must know about before touching the codebase]

## Patterns
[Recurring patterns: how components are structured, how API routes work, etc.]

## Do Not Touch
[Auto-generated dirs, migration files, vendored code]
```

Generated by `mexai map` via static scan. Developer owns this file — AI agents can propose additions via `context_save` but cannot auto-apply changes to Layer 2. Changes to `codebase.md` always require explicit `mexai commit`.

### Layer 3: Agent Rules (`rules.md`)

```markdown
## Code Quality
[TypeScript strictness, lint rules, patterns to avoid]

## Security
[Input validation rules, forbidden patterns, auth conventions]

## Consistency
[Naming conventions, file structure rules, import ordering]

## Review Gates
[What must be true before any change is committed]
```

Created at `mexai init`. Developer owns this entirely. AI agents read it but never propose changes to it. It is the constitution of the codebase.

---

## 5. Storage Design

### Local Store

```
~/.mexai/
├── config.json                  # Global config (token budget, default settings)
├── registry.json                # Project → codebase path mapping (single source of truth)
├── active                       # Plain text: slug of active project (fallback only)
└── projects/
    └── <slug>/
        ├── context.md           # Layer 1
        ├── codebase.md          # Layer 2
        ├── rules.md             # Layer 3
        ├── pending-diff.json    # Staged AI proposals awaiting review
        └── .git/                # Per-project git history
```

### `registry.json` Schema

Maps every Mexai project slug to its real codebase path on disk. This is the single source of truth for workspace-based auto-detection.

```typescript
interface MexaiRegistry {
  version: 1
  projects: Record<string, RegistryEntry>
}

interface RegistryEntry {
  path: string             // fs.realpathSync() — canonical, symlink-resolved
  remote?: string          // GitHub sidecar URL — set by `mexai sync --init`
  syncMode?: 'manual'      // always manual in v1 — explicit push/pull only
  registeredAt: string     // ISO datetime
  lastSeen: string         // ISO datetime — updated on each successful resolve
}
```

Example — local only:

```json
{
  "version": 1,
  "projects": {
    "pdfx": {
      "path": "/Users/akash/code/pdfx",
      "registeredAt": "2026-01-15T10:00:00Z",
      "lastSeen": "2026-04-08T09:30:00Z"
    }
  }
}
```

Example — with GitHub sync enabled:

```json
{
  "version": 1,
  "projects": {
    "pdfx": {
      "path": "/Users/akash/code/pdfx",
      "remote": "https://github.com/akash/pdfx-mexai",
      "syncMode": "manual",
      "registeredAt": "2026-01-15T10:00:00Z",
      "lastSeen": "2026-04-08T09:30:00Z"
    },
    "mexai": {
      "path": "/Users/akash/code/mexai",
      "registeredAt": "2026-01-20T14:00:00Z",
      "lastSeen": "2026-04-08T11:00:00Z"
    }
  }
}
```

### Project Resolution

This is the core UX behaviour — how the right project is identified automatically when an agent calls a tool.

**Resolution order (implemented in `StoreManager.resolveProject`):**

```
1. workspacePath provided (from MCP tool call)
   → normalize: fs.realpathSync(workspacePath)
   → scan registry for prefix match
   → if match found: update lastSeen, return slug

2. workspacePath provided but NO match found
   → stale path recovery: check if any slug's folder name
     matches the basename of workspacePath
   → if candidate found: surface recovery prompt / error message:
     "Looks like 'pdfx' moved. Run `mexai link` to re-register."
   → do NOT auto-update — require explicit confirmation

3. No workspacePath (or recovery failed)
   → read ~/.mexai/active
   → if slug present and project exists: return slug

4. Nothing resolves
   → throw NO_ACTIVE_PROJECT:
     "No project found for this workspace.
      Run `mexai init` in your project directory, or `mexai link` to register an existing project."
```

**Prefix matching logic:**

```typescript
function matchByPath(workspacePath: string, registry: MexaiRegistry): string | null {
  const resolved = fs.realpathSync(workspacePath)
  for (const [slug, entry] of Object.entries(registry.projects)) {
    if (resolved.startsWith(entry.path)) {
      return slug
    }
  }
  return null
}
```

**Stale path recovery logic:**

```typescript
function findStaleCandidate(workspacePath: string, registry: MexaiRegistry): string | null {
  const folderName = path.basename(workspacePath)
  // match by slug or by registered path's basename
  for (const [slug, entry] of Object.entries(registry.projects)) {
    const registeredName = path.basename(entry.path)
    if (slug === folderName || registeredName === folderName) {
      return slug
    }
  }
  return null
}
```

Using `startsWith` ensures monorepo sub-packages and nested paths all resolve correctly to the parent project. `realpathSync` ensures symlinked clones at different paths resolve to the same project.

### Per-Project Git

Each project directory is its own git repository. This provides:
- Full history of every context change
- `mexai log` with meaningful commit messages
- `mexai restore <hash>` for rollback
- Clean diffs per layer
- Optional push to GitHub sidecar (`mexai sync`)

Git is initialized automatically on `mexai init`. The developer never needs to interact with it directly.

### GitHub Sidecar (Optional Team Sync)

The sidecar is opt-in. Solo developers who don't need sync never touch it. Teams that want shared context get a clean, git-native workflow.

**Model: async, pull-based, manually triggered.** Not real-time. Not automatic. This is deliberate — context sync follows the same discipline as code sync. You push when you're ready, pull when you need the latest.

#### Setting Up Sync (Project Owner)

```
$ mexai sync --init
? GitHub repo name (default: pdfx-mexai): 
? Visibility: public / private
✓ Created github.com/akash/pdfx-mexai
✓ Pushed context.md, codebase.md, rules.md
✓ Registered remote in registry.json

→ Share with collaborators: mexai sync --clone https://github.com/akash/pdfx-mexai
```

#### Joining a Shared Project (Collaborator)

```
$ cd /Users/priya/code/pdfx
$ mexai sync --clone https://github.com/akash/pdfx-mexai
✓ Pulled context.md, codebase.md, rules.md
✓ Registered: /Users/priya/code/pdfx → pdfx
✓ Remote tracked: github.com/akash/pdfx-mexai

→ Your editor will now auto-detect pdfx. Run `mexai map` to generate your local codebase scan.
```

#### Day-to-Day Sync Commands

```
mexai sync --push     → push local context changes to remote
mexai sync --pull     → pull latest from remote into local store
mexai sync            → pull first, then push (safe default)
mexai sync --status   → show local vs remote diff summary
```

#### Conflict Model

The three-layer design minimises conflicts by design. Each layer has different ownership and different merge behaviour:

| Layer | Who writes | Conflict likelihood | Resolution |
|---|---|---|---|
| `context.md` | AI proposes, dev approves | Low — decisions are append-only | Git line merge handles most cases |
| `codebase.md` | Developer | Low — changes rarely | Manual — open real conversation |
| `rules.md` | Developer only | Very low — almost never changes | Manual — open real conversation |

**Append-only sections never conflict** (`## Decisions`, `## Open Threads add`). Each entry is its own line. Two devs adding decisions in the same day merge cleanly without intervention.

**Prose sections can conflict** (`## Current State`). When they do, git conflict markers appear. `mexai status` surfaces this immediately:

```
$ mexai status
→ Active project: pdfx
! Merge conflict in context.md (Current State)
  Both you and @priya updated this section.
  Run `mexai edit --layer context` to resolve, then `mexai commit`.
```

**`codebase.md` and `rules.md` conflicts require human resolution.** This is correct behaviour — a conflict in your conventions is a conversation that needs to happen between teammates, not something to auto-merge away.

#### What Is NOT Supported in v1

- **Auto-sync on commit** — no background daemon, no hooks, no silent writes
- **Per-user branches** — no PR workflow for context changes, too much friction
- **Conflict auto-resolution via LLM** — AI merging two `Current State` prose blocks would be an unreviewed AI write. Against the core trust model.
- **Access control beyond GitHub permissions** — public repo = anyone with access can push, private repo = invite only. Use GitHub for this.

### `config.json` Schema

```typescript
interface MexaiConfig {
  version: 1
  tokenBudget: {
    context: number    // default: 250
    codebase: number   // default: 300
    rules: number      // default: 150
  }
  defaultSource: ContextSource  // default: 'manual'
}
```

### `pending-diff.json` Schema

```typescript
interface PendingDiff {
  slug: string
  generatedAt: string           // ISO datetime
  sessionNote?: string
  sources: ContextSource[]      // which agents contributed
  layerChanges: {
    context?: ContextChanges    // proposed Layer 1 changes
    codebase?: CodebaseChanges  // proposed Layer 2 changes (rare)
  }
  preview: {
    summary: string             // "2 decisions added, 1 thread resolved"
    decisionsAdded: number
    threadsAdded: number
    threadsResolved: number
    currentStateChanged: boolean
    codebaseChanged: boolean
  }
}
```

---

## 6. Core Domain Design

### Module Map

```
packages/core/src/
├── types.ts                     # All shared types and interfaces
├── schemas.ts                   # Zod schemas (validation)
├── store/
│   ├── store-manager.ts         # Project CRUD, active state, path resolution
│   └── config-manager.ts        # Global config read/write
├── layers/
│   ├── context-format.ts        # Layer 1: parse, serialize, format-for-injection
│   ├── codebase-format.ts       # Layer 2: parse, serialize, format-for-injection
│   └── rules-format.ts          # Layer 3: parse, serialize, format-for-injection
├── diff/
│   ├── diff-engine.ts           # Build, merge, apply pending diffs
│   └── diff-merger.ts           # Merge rules for concurrent saves
├── scanner/
│   └── codebase-scanner.ts      # Static repo scan → codebase.md draft
├── export/
│   └── export-engine.ts         # Compose flat files within token budget
├── injection/
│   └── injection-composer.ts    # Assemble layer payloads for MCP injection
├── git/
│   └── git-wrapper.ts           # simple-git abstraction
├── sync/
│   └── sync-manager.ts          # GitHub sidecar push/pull/conflict detection
└── index.ts                     # Public API (explicit exports only)
```

### Store Manager

Responsible for all filesystem operations on the project store. All other modules receive data — they do not touch the filesystem directly.

```typescript
class StoreManager {
  // Store lifecycle
  ensureStore(): Promise<void>

  // Project CRUD
  initProject(name: string, opts: InitOptions): Promise<ProjectRecord>
  getProject(slug: string): Promise<ProjectRecord>
  listProjects(): Promise<ProjectSummary[]>

  // Registry — path ↔ project mapping
  registerPath(slug: string, codebasePath: string): Promise<void>
  linkPath(slug: string, codebasePath: string): Promise<void>   // mexai link
  resolveProject(workspacePath?: string): Promise<string>       // returns slug

  // Active project (fallback only)
  getActive(): Promise<string | null>
  setActive(slug: string): Promise<void>                        // mexai load

  // Layer I/O
  readLayer(slug: string, layer: Layer): Promise<string>
  writeLayer(slug: string, layer: Layer, content: string): Promise<void>

  // Pending diff I/O
  readPendingDiff(slug: string): Promise<PendingDiff | null>
  writePendingDiff(slug: string, diff: PendingDiff): Promise<void>
  clearPendingDiff(slug: string): Promise<void>
}
```

`resolveProject` is the single entry point for all project resolution. Every MCP tool and every CLI command that needs the active project calls this — never reads `active` or `registry.json` directly.

### Diff Engine

The most critical module. Handles the full lifecycle of a pending diff.

**Build:** Creates a new `PendingDiff` from a set of `ProposedChanges`.

**Merge:** When a second AI call happens before the first diff is committed, merge rules apply:

| Field | Rule |
|---|---|
| `decisions` | Append (both are valid, no dedup) |
| `openThreads add` | Dedup by content |
| `openThreads check_off` + pending `add` | Net-zero (cancel both) |
| `currentState` | Last write wins |
| `sources` | Union (deduplicated array) |

**Apply:** Takes the current layer content and a `PendingDiff`, returns the updated content. Never writes to disk — that is the Store Manager's job.

```typescript
class DiffEngine {
  build(proposed: ProposedChanges, source: ContextSource): PendingDiff
  merge(existing: PendingDiff, incoming: ProposedChanges, source: ContextSource): PendingDiff
  apply(current: ParsedContext, diff: PendingDiff): ApplyResult
}
```

### Codebase Scanner

Static analysis of a project directory. Produces a structured `codebase.md` draft.

**What it reads:**
- Folder structure (up to 3 levels, excluding `node_modules`, `.git`, `dist`, `build`, `.next`)
- `package.json` — dependencies, scripts, name
- `tsconfig.json` — strictness settings
- Framework detection heuristics (Next.js, Vite, Express, etc.)
- Test framework detection (Vitest, Jest, etc.)
- CSS/styling detection (Tailwind, CSS Modules, styled-components)

**What it does NOT do:**
- Call any LLM
- Read source file contents (only filenames and structure)
- Make assumptions about business logic

Output is always a draft marked clearly as requiring human review.

```typescript
class CodebaseScanner {
  scan(projectRoot: string): Promise<CodebaseScanResult>
  generateDraft(result: CodebaseScanResult): string  // returns codebase.md draft
}
```

### Sync Manager

Handles all GitHub sidecar operations. Uses `simple-git` under the hood. All methods are pull-safe — they check for conflicts before applying remote changes and surface them as typed errors rather than leaving git conflict markers silently.

```typescript
class SyncManager {
  // Setup
  initRemote(slug: string, repoName: string, visibility: 'public' | 'private'): Promise<void>
  cloneRemote(url: string, slug: string, localPath: string): Promise<void>

  // Day-to-day
  push(slug: string): Promise<SyncPushResult>
  pull(slug: string): Promise<SyncPullResult>
  sync(slug: string): Promise<SyncResult>   // pull then push
  status(slug: string): Promise<SyncStatus>
}

type SyncPushResult =
  | { success: true; layersPushed: Layer[] }
  | { success: false; error: 'NO_REMOTE' | 'PUSH_FAILED'; message: string }

type SyncPullResult =
  | { success: true; layersUpdated: Layer[]; conflicts: ConflictReport[] }
  | { success: false; error: 'NO_REMOTE' | 'PULL_FAILED'; message: string }

interface ConflictReport {
  layer: Layer
  section: string      // e.g. 'Current State', 'Conventions'
  resolution: 'manual-required'
}

interface SyncStatus {
  remote: string
  localAhead: number   // commits not yet pushed
  remoteAhead: number  // commits not yet pulled
  hasConflicts: boolean
  lastSynced: string | null
}
```

Assembles the injection payload for a given context and budget.

```typescript
class InjectionComposer {
  compose(slug: string, opts: ComposeOptions): Promise<InjectionPayload>
}

interface ComposeOptions {
  layers: ('context' | 'codebase' | 'rules')[]  // which layers to include
  budget: TokenBudget
  taskHint?: string  // optional: filter codebase map to relevant sections
}

interface InjectionPayload {
  text: string        // final injection text
  tokensUsed: number
  layerBreakdown: Record<string, number>
}
```

### Export Engine

Composes flat files for non-MCP agents. Respects the token budget. Produces:
- `AGENTS.md` — standard format, works with most agents
- `CLAUDE.md` — Claude-specific format with MCP instructions removed
- `.cursorrules` — Cursor-specific, rules-focused

```typescript
class ExportEngine {
  exportAgentsMd(slug: string): Promise<string>
  exportClaudeMd(slug: string): Promise<string>
  exportCursorRules(slug: string): Promise<string>
}
```

---

## 7. MCP Server Design

### Server Setup

```typescript
// packages/mcp/src/server.ts
const server = new McpServer({
  name: 'mexai',
  version: pkg.version,
})

// Transport: stdio
// The editor spawns `mexai serve` as a subprocess
const transport = new StdioServerTransport()
await server.connect(transport)
```

### Tools

#### `context_read`

Primary orientation tool. Called at session start. Auto-detects the active project from the workspace path — no manual project selection required.

```typescript
{
  name: 'context_read',
  description: [
    'Read the active project context.',
    'Call this at the start of every session to orient yourself.',
    'Pass workspacePath (the editor workspace root) for automatic project detection.',
    'Returns project identity, current state, key decisions, open threads, codebase map, and agent rules.',
  ].join(' '),
  inputSchema: z.object({
    workspacePath: z.string().optional(), // editor workspace root — used for auto-detection
    slug: z.string().optional(),          // explicit override — rarely needed
    layers: z.array(z.enum(['context', 'codebase', 'rules'])).optional(),
    maxTokens: z.number().default(700),
  })
}
```

**Resolution logic inside the tool handler:**

```typescript
async function handleContextRead(input: ContextReadInput) {
  // 1. Explicit slug always wins
  if (input.slug) {
    return loadContext(input.slug, input)
  }

  // 2. Workspace path → registry prefix match
  if (input.workspacePath) {
    const slug = await storeManager.resolveProject(input.workspacePath)
    if (slug) return loadContext(slug, input)
  }

  // 3. Fallback to active project
  const active = await storeManager.getActive()
  if (active) return loadContext(active, input)

  // 4. Nothing resolved
  throw mcpError('NO_ACTIVE_PROJECT',
    'No project found for this workspace. Run `mexai init` in your project directory or `mexai link <path>` to register it.'
  )
}
```

Returns a formatted injection payload composed from the requested layers within the token budget.

#### `context_save`

Proposes changes to Layer 1. Never auto-applies.

```typescript
{
  name: 'context_save',
  description: [
    'Propose updates to the project context.',
    'Call when the user says "save this", "remember this", "log this decision".',
    'Changes are staged for developer review — not applied immediately.',
    'commitMessage format: "mexai: <concise description>" (max 72 chars)',
  ].join(' '),
  inputSchema: z.object({
    slug: z.string().optional(),
    source: z.enum(['cursor', 'claude-code', 'vscode', 'opencode', 'manual']),
    commitMessage: z.string().max(72),
    sessionNote: z.string().optional(),
    changes: z.object({
      decisions: z.array(ProposedDecisionSchema).optional(),
      openThreads: z.array(ProposedThreadSchema).optional(),
      currentState: z.string().optional(),
    }),
  })
}
```

#### `codebase_read`

Returns the codebase map. Called when an agent needs structural orientation.

```typescript
{
  name: 'codebase_read',
  description: [
    'Read the codebase map for the active project.',
    'Call when you need to understand project structure, conventions, or key files.',
    'More efficient than reading raw files — use this first.',
  ].join(' '),
  inputSchema: z.object({
    slug: z.string().optional(),
    section: z.enum(['structure', 'conventions', 'key-files', 'patterns', 'all']).default('all'),
  })
}
```

#### `rules_read`

Returns agent rules. Called when an agent needs quality/consistency guardrails.

```typescript
{
  name: 'rules_read',
  description: [
    'Read the agent rules for the active project.',
    'Call before writing any code to understand quality gates and non-negotiables.',
  ].join(' '),
  inputSchema: z.object({
    slug: z.string().optional(),
  })
}
```

#### `context_list`

Lists all projects.

```typescript
{
  name: 'context_list',
  description: 'List all Mexai projects.',
  inputSchema: z.object({})
}
```

### Resources

Resources are injected automatically by editors that support MCP resource injection into the system prompt.

| URI | Content | Token Target |
|---|---|---|
| `mexai://context` | Layer 1 only | ~250 |
| `mexai://codebase` | Layer 2 only | ~300 |
| `mexai://rules` | Layer 3 only | ~150 |
| `mexai://all` | All three layers | ~700 |

### Error Handling

All MCP tools return typed errors. No raw throws escape the tool boundary.

```typescript
type McpToolResult =
  | { success: true; content: string; tokensUsed: number }
  | { success: false; error: McpErrorCode; message: string }

type McpErrorCode =
  | 'NO_ACTIVE_PROJECT'
  | 'PROJECT_NOT_FOUND'
  | 'LAYER_NOT_INITIALIZED'
  | 'VALIDATION_ERROR'
  | 'STORE_ERROR'
```

---

## 8. CLI Design

### Command Structure

```
mexai
├── init [name]           Create a project + auto-register cwd in registry
├── map                   Generate codebase map from static scan
├── connect <agent>       Write MCP config + export flat files
├── diff [--discard]      Review or discard pending AI proposals
├── commit <message>      Apply pending diff and commit to git
├── link [path]           Register a codebase path for an existing project
├── load <slug>           Set active project (fallback override)
├── list                  List all projects with registered paths
├── status                Show active project, pending changes, and conflicts
├── log [-n <count>]      Show context change history
├── restore <hash>        Restore a previous version
├── edit [--layer <l>]    Open a layer in $EDITOR
├── export                Write flat files to current directory
├── sync                  Pull then push to GitHub sidecar (default)
│   ├── --init            Create sidecar repo and push for first time
│   ├── --clone <url>     Pull shared context from remote and register locally
│   ├── --push            Push local context to remote
│   ├── --pull            Pull remote context to local store
│   └── --status          Show local vs remote diff summary
└── serve                 Start MCP server over stdio
```

### `mexai init` Flow

Two paths:

**Interactive (default):**
```
$ cd /Users/akash/code/pdfx
$ mexai init "PDFx"
? Domain (e.g. "open-source / dev tool"): ...
? Tech stack (comma-separated): ...
? What is this project? (2-3 sentences): ...
? What are you working on right now?: ...
? Set up agent rules now? (Y/n): 
  → Y: opens $EDITOR with rules template
  → n: copies starter rules template, skippable later

✓ Created ~/.mexai/projects/pdfx/
✓ context.md initialized
✓ codebase.md initialized (run `mexai map` to populate)
✓ rules.md initialized
✓ Git initialized
✓ Registered: /Users/akash/code/pdfx → pdfx

→ Active project: pdfx
→ Next: mexai map && mexai connect cursor
```

**Non-interactive (`-y`):**
```
$ mexai init "My Project" -y \
    --stack "TypeScript, React, Vite" \
    --domain "open-source"

✓ Created with defaults. Edit ~/.mexai/projects/my-project/ to refine.
```

### `mexai map` Flow

```
$ mexai map
Scanning /Users/akash/projects/my-project...

✓ Detected: TypeScript + React + Vite
✓ Found 847 files across 23 directories (excluding node_modules, .git)
✓ Key config files: tsconfig.json, vite.config.ts, tailwind.config.ts

Draft written to ~/.mexai/projects/my-project/codebase.md

→ Review and edit the draft before using it in sessions.
  Run `mexai edit --layer codebase` to open in your editor.
```

### `mexai connect` Flow

Writes MCP config to the correct location AND exports flat files to the project directory.

```
$ mexai connect cursor
✓ Wrote ~/.cursor/mcp.json (merged with existing config)
✓ Wrote ./AGENTS.md to current directory

Restart Cursor to connect.
```

Supported agents: `cursor`, `claude-code`, `vscode`, `opencode`

For agents without MCP support, `mexai connect <agent>` still works — it just writes flat files and explains how to use them.

### `mexai link` Flow

For cases where `mexai init` was run from a different machine, or the project was set up before Mexai was installed. Associates an existing Mexai project with a codebase path.

```
$ cd /Users/akash/code/pdfx
$ mexai link

? Which project does this directory belong to?
  ❯ pdfx
    mexai
    other-project

✓ Registered: /Users/akash/code/pdfx → pdfx
→ Open this directory in your editor — Mexai will detect it automatically.
```

Or non-interactively:

```
$ mexai link /Users/akash/code/pdfx --project pdfx
✓ Registered: /Users/akash/code/pdfx → pdfx
```

### `mexai sync` Flow

See [GitHub Sidecar](#github-sidecar-optional-team-sync) in Storage Design for full model. CLI output examples:

**Owner initialising sync:**
```
$ mexai sync --init
? GitHub repo name: pdfx-mexai
? Visibility: private
✓ Created github.com/akash/pdfx-mexai
✓ Pushed 3 layer files
✓ Remote registered in registry.json
→ Share: mexai sync --clone https://github.com/akash/pdfx-mexai
```

**Collaborator joining:**
```
$ cd /Users/priya/code/pdfx
$ mexai sync --clone https://github.com/akash/pdfx-mexai
✓ Pulled context.md, codebase.md, rules.md → pdfx
✓ Registered: /Users/priya/code/pdfx → pdfx
→ Run `mexai map` to generate your local codebase scan.
```

**Daily push:**
```
$ mexai sync --push
✓ Pushed context.md (2 new decisions)
→ github.com/akash/pdfx-mexai up to date
```

**Pull with conflict:**
```
$ mexai sync --pull
✓ Pulled context.md
! Merge conflict in context.md (Current State section)
  Run `mexai edit --layer context` to resolve, then `mexai commit`.
```

### `mexai status` Output

```
$ mexai status
→ Active project: pdfx (/Users/akash/code/pdfx)
→ Remote: github.com/akash/pdfx-mexai (manual sync)
→ Last synced: 2 hours ago

  context.md     1 pending decision (unreviewed)
  codebase.md    up to date
  rules.md       up to date

! 1 merge conflict in context.md — run `mexai edit --layer context` to resolve
```

### Terminal Output Style

Consistent prefix system:
- `✓` — success
- `→` — info / next step
- `!` — warning
- `✗` — error

Diff display uses a framed block for scannability:

```
┌─ Pending Changes ─────────────────────────────────────────────┐
│                                                               │
│  DECISIONS (1 added)                                         │
│  + Chose Vitest over Jest (2026-04-08, via cursor)           │
│    Faster, ESM-native. Ruled out Jest — setup overhead.      │
│                                                               │
│  OPEN THREADS (1 resolved)                                   │
│  ✓ [x] Testing framework decision — resolved                  │
│                                                               │
│  Source: cursor · 4 minutes ago                              │
│  Summary: 1 decision added, 1 thread resolved                │
└───────────────────────────────────────────────────────────────┘

  mexai commit "chose Vitest over Jest"
  mexai diff --discard
```

---

## 9. Flat File Export Design

### Composition Strategy

All three layers are composed into a single file within a strict token budget. Section order and priority:

1. **Rules** (always included, ~150 tokens) — non-negotiable, agents must read this
2. **Context: Identity + Current State** (~100 tokens) — orientation
3. **Context: Decisions** (~100 tokens) — most recent first, oldest truncated
4. **Context: Open Threads** (~50 tokens) — unresolved items only
5. **Codebase: Conventions** (~100 tokens) — highest-value section
6. **Codebase: Key Files** (~100 tokens) — file map
7. **Codebase: Structure** (~100 tokens) — directory tree (truncated to fit)
8. **Footer: Instructions** (~50 tokens) — how to save, commit message format

Total: ~750 tokens ceiling, tunable via config.

### AGENTS.md Format

```markdown
<!-- Generated by Mexai — do not edit directly. Run `mexai export` to regenerate. -->
<!-- Last updated: 2026-04-08 -->

# [Project Name] — Agent Context

## Rules
[Layer 3 content]

## Project
[Layer 1: Identity + Current State]

## Key Decisions
[Layer 1: Decisions — most recent N within budget]

## Open Threads
[Layer 1: Open Threads — unresolved only]

## Codebase
[Layer 2: Conventions + Key Files + Structure — trimmed to budget]

---
*Context managed by [Mexai](https://github.com/mexai/mexai). 
When user says "save this" or "remember this", propose changes via the save flow.*
```

---

## 10. Token Budget System

### Philosophy

Token cost is predictable, not emergent. Mexai guarantees that injection never exceeds the configured ceiling regardless of how much context the developer has written.

### Budget Allocation (Defaults)

| Layer | Default Ceiling | Adjustable |
|---|---|---|
| Layer 1: Context | 250 tokens | Yes |
| Layer 2: Codebase | 300 tokens | Yes |
| Layer 3: Rules | 150 tokens | Yes |
| **Total** | **700 tokens** | Yes |

### Truncation Rules

When a layer exceeds its ceiling, truncation is deterministic and lossless-by-priority:

**Context (Layer 1):**
- Identity: never truncated
- Current State: never truncated
- Decisions: oldest entries removed first until within budget
- Open Threads: resolved threads removed first, then oldest unresolved

**Codebase (Layer 2):**
- Key Files: never truncated
- Conventions: never truncated
- Structure tree: deepest levels removed first
- Patterns: oldest entries removed first

**Rules (Layer 3):**
- Never truncated — if rules exceed ceiling, developer is warned on `mexai status`

### Token Counting

Approximation: 1 token ≈ 4 characters (conservative, works well for English technical content). The budget system is intentionally conservative — it is better to be under budget than over.

```typescript
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
```

---

## 11. Type System

All types in `packages/core/src/types.ts`. No type is defined outside this file except locally-scoped generics.

```typescript
// ─── Primitives ───────────────────────────────────────────────

export type ContextSource = 'cursor' | 'claude-code' | 'vscode' | 'opencode' | 'manual'
export type ProjectStatus = 'active' | 'paused' | 'archived'
export type Layer = 'context' | 'codebase' | 'rules'

// ─── Layer 1: Project Context ─────────────────────────────────

export interface ContextFrontmatter {
  name: string
  slug: string
  format_version: 1
  domain?: string
  stack?: string[]
  status: ProjectStatus
  created_at: string
  last_updated: string
}

export interface DecisionEntry {
  title: string
  date: string
  source: ContextSource
  reason: string
  ruledOut?: string
  sourceQuote?: string
}

export interface ThreadEntry {
  content: string
  resolved: boolean
  resolvedAt?: string
}

export interface ParsedContext {
  frontmatter: ContextFrontmatter
  identity: string
  currentState: string
  decisions: DecisionEntry[]
  openThreads: ThreadEntry[]
}

// ─── Layer 2: Codebase Map ────────────────────────────────────

export interface ParsedCodebase {
  structure: string
  conventions: string
  keyFiles: string
  patterns: string
  doNotTouch: string
}

// ─── Layer 3: Agent Rules ─────────────────────────────────────

export interface ParsedRules {
  codeQuality: string
  security: string
  consistency: string
  reviewGates: string
}

// ─── Proposals ────────────────────────────────────────────────

export interface ProposedDecision {
  title: string
  reason: string
  ruledOut?: string
  sourceQuote?: string
}

export interface ProposedThread {
  action: 'add' | 'check_off'
  content: string
}

export interface ContextChanges {
  decisions?: ProposedDecision[]
  openThreads?: ProposedThread[]
  currentState?: string
}

export interface CodebaseChanges {
  conventions?: string     // proposed addition to conventions section
  keyFiles?: string        // proposed addition to key files
}

// ─── Pending Diff ─────────────────────────────────────────────

export interface PendingDiff {
  slug: string
  generatedAt: string
  sessionNote?: string
  sources: ContextSource[]
  layerChanges: {
    context?: ContextChanges
    codebase?: CodebaseChanges
  }
  preview: DiffPreview
}

export interface DiffPreview {
  summary: string
  decisionsAdded: number
  threadsAdded: number
  threadsResolved: number
  currentStateChanged: boolean
  codebaseChanged: boolean
}

// ─── Scanner ──────────────────────────────────────────────────

export interface CodebaseScanResult {
  projectRoot: string
  detectedFrameworks: string[]
  detectedLanguages: string[]
  detectedTestFramework: string | null
  detectedStyling: string | null
  directoryTree: DirectoryNode[]
  packageJson: Record<string, unknown> | null
  configFiles: string[]
}

export interface DirectoryNode {
  name: string
  type: 'file' | 'directory'
  children?: DirectoryNode[]
}

// ─── Summaries ────────────────────────────────────────────────

export interface ProjectSummary {
  slug: string
  name: string
  domain?: string
  status: ProjectStatus
  lastUpdated: string
  isActive: boolean
  hasPendingDiff: boolean
  layersInitialized: Layer[]
}

// ─── Git ──────────────────────────────────────────────────────

export interface GitLogEntry {
  hash: string
  shortHash: string
  message: string
  date: string
  relativeDate: string
}

// ─── Config ───────────────────────────────────────────────────

export interface MexaiConfig {
  version: 1
  tokenBudget: {
    context: number
    codebase: number
    rules: number
  }
  defaultSource: ContextSource
}

// ─── Results ──────────────────────────────────────────────────

export interface ApplyResult {
  updatedContent: string
  summary: string
}

export interface InjectionPayload {
  text: string
  tokensUsed: number
  layerBreakdown: Record<Layer, number>
}
```

---

## 12. Testing Strategy

### Philosophy

Tests must be fast, isolated, and meaningful. No tests that require a real git repo, real filesystem, or real LLM call in the unit layer. Integration tests may use a temporary filesystem but must clean up after themselves.

### Package: `@mexai/core`

**Unit tests (Vitest):**

Every pure function has unit tests. No exceptions.

| Module | What to Test |
|---|---|
| `context-format.ts` | parse → serialize roundtrip, edge cases (empty sections, long decisions, unicode) |
| `codebase-format.ts` | parse → serialize roundtrip |
| `rules-format.ts` | parse → serialize roundtrip |
| `diff-engine.ts` | build, merge conflict scenarios, apply correctness |
| `diff-merger.ts` | all merge rules (append, net-zero, last-write-wins, dedup) |
| `injection-composer.ts` | token budget enforcement, truncation order, layer selection |
| `export-engine.ts` | output format correctness, budget enforcement |
| `codebase-scanner.ts` | heuristic detection (mock filesystem) |

**Integration tests (Vitest + tmp filesystem):**

| Scenario | Coverage |
|---|---|
| Full init → write → read → diff → commit cycle | Happy path |
| Multiple saves before commit (merge path) | Concurrent saves |
| Restore to previous version | Git rollback |
| Token budget exceeded → correct truncation | Budget enforcement |
| Missing active project → correct error | Error handling |

### Package: `@mexai/mcp`

**Integration tests (Vitest):**

Spawn the MCP server as a subprocess, send real MCP messages via stdio, assert responses.

| Tool | Test Cases |
|---|---|
| `context_read` | Returns payload, respects token budget, handles no active project |
| `context_save` | Writes pending diff, merges correctly on second call |
| `codebase_read` | Returns layer 2, section filtering works |
| `rules_read` | Returns layer 3 |
| `context_list` | Returns all projects with correct active marker |

### Test File Conventions

```
packages/core/
└── src/
    └── diff/
        ├── diff-engine.ts
        └── diff-engine.test.ts    ← co-located, not in separate __tests__ dir
```

Test naming: `describe('DiffEngine') > describe('merge') > it('appends decisions from concurrent saves')`

---

## 13. Build System

### Turborepo Pipeline (`turbo.json`)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### `tsup` Config (per package)

```typescript
// packages/core/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
```

```typescript
// packages/cli/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],       // CLI is CJS only — Node.js binary
  dts: false,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
})
```

### TypeScript Config

Shared base in `tooling/tsconfig/base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

`exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are non-negotiable for a tool that handles user data.

### Scripts (Root `package.json`)

```json
{
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "dev": "turbo run dev",
    "changeset": "changeset",
    "release": "turbo run build && changeset publish"
  }
}
```

---

## 14. OSS Conventions

### Commit Convention

Conventional Commits, enforced by `commitlint`:

```
feat(core): add merge rule for concurrent saves
fix(cli): handle missing active project in diff command
docs(arch): document token budget truncation order
test(mcp): add integration tests for context_save tool
chore: update dependencies
```

Scopes: `core`, `cli`, `mcp`, `tooling`, `docs`

### Versioning

Changesets (`@changesets/cli`). Each PR that changes behavior includes a changeset file. Release is `pnpm changeset publish` after merge to `main`.

Packages are versioned independently. `@mexai/core` version bumps don't force `mexai` CLI version bumps unless there are user-facing changes.

### Branch Strategy

- `main` — always releasable
- `feat/<name>` — feature branches, PR to main
- `fix/<name>` — bug fixes, PR to main

No long-lived branches. No `develop`. Ship from `main`.

### CI (GitHub Actions)

On every PR:
1. `pnpm install --frozen-lockfile`
2. `turbo run typecheck`
3. `turbo run lint`
4. `turbo run build`
5. `turbo run test`

On merge to `main`:
6. Check for changesets → auto-publish if present

### Contributing Guide

Root `CONTRIBUTING.md` covers:
- Local setup (prerequisites, `pnpm install`, `pnpm build`)
- Running tests (`pnpm test`)
- Writing a changeset (`pnpm changeset`)
- PR checklist (tests, changeset, conventional commit)

---

## 15. Decisions Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Turborepo + pnpm workspaces** | Fast incremental builds, simple pipeline definition, good OSS precedent (e.g. Vercel projects) |
| 2 | **Three separate layer files** | Different update cadence and ownership model per layer. One file creates noisy diffs and conflates concerns. |
| 3 | **AI proposes Layer 1 only** | Codebase map and rules are developer-owned artifacts. Allowing AI to auto-propose changes to them erodes the trust model. |
| 4 | **Static scan only for `mexai map`** | LLM-based extraction adds API key dependency, latency, and cost. Static scan is fast, offline, and produces a good-enough draft for human refinement. |
| 5 | **Per-project git repos** | Isolated history per project. No risk of context changes from one project polluting another's log. Enables per-project restore without complexity. |
| 6 | **Token budget enforced in core, not MCP** | Budget logic belongs to the domain, not the transport. This ensures flat file exports and MCP injection use the same budget system. |
| 7 | **tsup over tsc directly** | tsup produces CJS + ESM dual output with source maps and declarations in one config. Simpler than maintaining separate tsc configs per format. |
| 8 | **`exactOptionalPropertyTypes` enabled** | User data persistence requires precision. This catches a class of bugs where `undefined` is treated as a valid value in optional fields. |
| 9 | **No E2E tests in v1** | CLI E2E requires real process spawning and filesystem setup. High maintenance cost for early-stage OSS. Unit + integration coverage is sufficient to ship with confidence. |
| 10 | **Changesets over semantic-release** | More explicit, PR-level control over version bumps. Works well for monorepos with independently-versioned packages. |
| 11 | **MCP resources for auto-injection** | Editors that support resource injection (Cursor, Claude Code) can inject context without the agent needing to call `context_read` explicitly — reducing the tool call overhead per session. |
| 12 | **`mexai://all` resource at 700 tokens** | Provides a single URI for editors that only support one resource injection. The ceiling is generous enough for full context but bounded enough to avoid prompt bloat. |
| 13 | **`registry.json` over per-project `.mexai-link` files** | Central registry is a single source of truth — faster lookup, easier to debug, no file scattering across project stores. Simpler to extend (multi-root, tags) in future. |
| 14 | **Prefix-based path matching with `fs.realpathSync`** | Prefix match handles monorepos and nested workspaces correctly. `realpathSync` resolves symlinks so that clones at different paths or via symlinks resolve to the same project. Exact match would break both cases. |
| 15 | **`resolveProject` as the single resolution entry point** | All MCP tools and CLI commands resolve the active project through one method. Resolution order (workspace path → stale recovery → active fallback → error) is consistent everywhere and cannot diverge. |
| 16 | **Stale path recovery without auto-update** | When a path no longer matches, Mexai surfaces a helpful error rather than silently auto-correcting. Auto-update could silently re-link the wrong project in edge cases (e.g. two projects with the same folder name). Explicit `mexai link` is one command and safer. |
| 17 | **Manual sync only — no auto-sync daemon** | Background sync breaks the trust model. Developers push context updates consciously, the same discipline as pushing code. Silent background writes to shared context would erode trust in what the context actually says. |
| 18 | **No LLM conflict resolution** | Merging two `Current State` prose blocks via AI would be an unreviewed AI write to the context. This violates the core principle. A conflict in shared context is a signal that teammates need to talk — not something to auto-resolve away. |