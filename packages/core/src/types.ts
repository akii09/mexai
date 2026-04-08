/**
 * @mexai/core — shared type definitions.
 * All types live here. Never define shared types elsewhere.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Which AI agent or tool produced a context save. */
export type ContextSource =
  | 'claude-code'
  | 'cursor'
  | 'vscode'
  | 'opencode'
  | 'manual'

/** Lifecycle state of a project. */
export type ProjectStatus = 'active' | 'archived'

/** The three layer identifiers. */
export type Layer = 'context' | 'codebase' | 'rules'

// ---------------------------------------------------------------------------
// Layer 1 — Project Context (context.md)
// ---------------------------------------------------------------------------

/** YAML frontmatter fields at the top of context.md. */
export interface ContextFrontmatter {
  name: string
  slug: string
  domain: string
  stack: string[]
  status: ProjectStatus
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
}

/** A single architectural or design decision. */
export interface DecisionEntry {
  date: string          // ISO 8601 date
  title: string
  rationale: string
}

/** An open work item or question. */
export interface ThreadEntry {
  content: string
  resolved: boolean
  addedAt: string      // ISO 8601 date
}

/** Parsed representation of context.md. */
export interface ParsedContext {
  frontmatter: ContextFrontmatter
  identity: string
  currentState: string
  decisions: DecisionEntry[]
  openThreads: ThreadEntry[]
}

// ---------------------------------------------------------------------------
// Layer 2 — Codebase Map (codebase.md)
// ---------------------------------------------------------------------------

/** Parsed representation of codebase.md. */
export interface ParsedCodebase {
  structure: string        // directory tree as raw text
  keyFiles: string         // key files section as raw text
  conventions: string      // conventions section as raw text
  patterns: string         // patterns section as raw text
  doNotTouch: string       // do-not-touch list as raw text
}

// ---------------------------------------------------------------------------
// Layer 3 — Agent Rules (rules.md)
// ---------------------------------------------------------------------------

/** Parsed representation of rules.md. */
export interface ParsedRules {
  codeQuality: string
  security: string
  consistency: string
  reviewGates: string
  raw: string              // full raw markdown (rules are never truncated)
}

// ---------------------------------------------------------------------------
// Proposals — what an AI agent submits via context_save
// ---------------------------------------------------------------------------

/** A decision an agent is proposing to add. */
export interface ProposedDecision {
  title: string
  rationale: string
  date?: string | undefined  // defaults to today if omitted
}

/** An open thread an agent is proposing to add or resolve. */
export interface ProposedThread {
  action: 'add' | 'check_off'
  content: string
}

/** Changes to Layer 1 (context). */
export interface ContextChanges {
  decisions?: ProposedDecision[] | undefined
  openThreads?: ProposedThread[] | undefined
  currentState?: string | undefined
}

/** Changes to Layer 2 (codebase). Currently a raw text replacement. */
export interface CodebaseChanges {
  raw: string
}

// ---------------------------------------------------------------------------
// Pending Diff
// ---------------------------------------------------------------------------

/** A staged but not-yet-committed set of changes. */
export interface PendingDiff {
  projectSlug: string
  sources: ContextSource[]
  commitMessage: string
  sessionNote?: string | undefined
  changes: ContextChanges
  createdAt: string        // ISO 8601
  updatedAt: string        // ISO 8601
  preview: DiffPreview
}

/** Human-readable summary of what is staged. */
export interface DiffPreview {
  decisionsAdded: number
  threadsAdded: number
  threadsResolved: number
  currentStateChanged: boolean
  summary: string
}

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

/** A single node in the scanned directory tree. */
export interface DirectoryNode {
  name: string
  type: 'file' | 'directory'
  children?: DirectoryNode[]
}

/** Result returned by CodebaseScanner.scan(). */
export interface CodebaseScanResult {
  root: string
  tree: DirectoryNode
  packageJson?: Record<string, unknown> | undefined
  frameworks: string[]
  testFrameworks: string[]
  styling: string[]
  hasTypeScript: boolean
  strictMode: boolean
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/** A single entry in registry.json. */
export interface RegistryEntry {
  slug: string
  name: string
  path: string             // absolute path to the codebase root
  remote?: string | undefined
  createdAt: string        // ISO 8601
  updatedAt: string        // ISO 8601
}

/** The full registry.json structure. */
export interface MexaiRegistry {
  version: 1
  entries: RegistryEntry[]
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** User-level config stored in ~/.mexai/config.json. */
export interface MexaiConfig {
  version: 1
  tokenBudget: TokenBudgetConfig
  githubToken?: string | undefined
}

/** Per-layer token ceiling configuration. */
export interface TokenBudgetConfig {
  context: number    // default 250
  codebase: number   // default 300
  rules: number      // default 150
  total: number      // default 700
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/** Result of a sync push operation. */
export interface SyncPushResult {
  success: boolean
  commitHash?: string | undefined
  error?: string | undefined
}

/** A conflict found during a pull. */
export interface ConflictReport {
  file: string
  localContent: string
  remoteContent: string
}

/** Result of a sync pull operation. */
export interface SyncPullResult {
  success: boolean
  conflicts: ConflictReport[]
  error?: string | undefined
}

/** Current sync state for a project. */
export interface SyncStatus {
  hasRemote: boolean
  localAhead: number
  remoteAhead: number
  lastSyncedAt?: string | undefined
  conflicts: number
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** Result of applying a pending diff. */
export interface ApplyResult {
  updatedContent: string
  summary: string
}

/** Token-budget breakdown per layer. */
export interface LayerBreakdown {
  context: number
  codebase: number
  rules: number
}

/** The payload injected into an AI session. */
export interface InjectionPayload {
  text: string
  tokensUsed: number
  layerBreakdown: LayerBreakdown
}

/** Summary of a project for list views. */
export interface ProjectSummary {
  slug: string
  name: string
  path: string
  status: ProjectStatus
  updatedAt: string
  hasPendingDiff: boolean
  remote?: string | undefined
}

/** A single git log entry. */
export interface GitLogEntry {
  hash: string
  message: string
  date: string
  author: string
}

// ---------------------------------------------------------------------------
// MCP
// ---------------------------------------------------------------------------

/** Error codes returned by MCP tools. */
export type McpErrorCode =
  | 'NO_ACTIVE_PROJECT'
  | 'PROJECT_NOT_FOUND'
  | 'LAYER_NOT_INITIALIZED'
  | 'VALIDATION_ERROR'
  | 'STORE_ERROR'
  | 'GIT_ERROR'
  | 'SYNC_ERROR'
  | 'TOKEN_BUDGET_EXCEEDED'

/** Standard return shape for all MCP tools. */
export type McpToolResult =
  | { success: true; data: unknown }
  | { success: false; error: McpErrorCode; message: string }

// ---------------------------------------------------------------------------
// Store errors
// ---------------------------------------------------------------------------

/** Typed error for all store-layer failures. */
export class StoreError extends Error {
  readonly code: McpErrorCode

  constructor(code: McpErrorCode, message: string) {
    super(message)
    this.name = 'StoreError'
    this.code = code
  }
}
