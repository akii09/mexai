/**
 * @mexai/core — public API.
 * All types, schemas, and domain modules exported from here.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  ContextSource,
  ProjectStatus,
  Layer,
  ContextFrontmatter,
  DecisionEntry,
  ThreadEntry,
  ParsedContext,
  ParsedCodebase,
  ParsedRules,
  ProposedDecision,
  ProposedThread,
  ContextChanges,
  CodebaseChanges,
  PendingDiff,
  DiffPreview,
  DirectoryNode,
  CodebaseScanResult,
  RegistryEntry,
  MexaiRegistry,
  MexaiConfig,
  TokenBudgetConfig,
  SyncPushResult,
  ConflictReport,
  SyncPullResult,
  SyncStatus,
  ApplyResult,
  LayerBreakdown,
  InjectionPayload,
  ProjectSummary,
  GitLogEntry,
  McpErrorCode,
  McpToolResult,
} from './types.js'

export { StoreError } from './types.js'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export {
  ContextSourceSchema,
  ProjectStatusSchema,
  LayerSchema,
  ContextFrontmatterSchema,
  DecisionEntrySchema,
  ThreadEntrySchema,
  ProposedDecisionSchema,
  ProposedThreadSchema,
  ContextChangesSchema,
  DiffPreviewSchema,
  PendingDiffSchema,
  RegistryEntrySchema,
  MexaiRegistrySchema,
  TokenBudgetConfigSchema,
  MexaiConfigSchema,
  InitOptionsSchema,
  ContextReadInputSchema,
  ContextSaveInputSchema,
  CodebaseReadInputSchema,
  RulesReadInputSchema,
  ContextListInputSchema,
} from './schemas.js'

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export {
  ensureStore,
  initProject,
  resolveProject,
  getActive,
  setActive,
  readLayer,
  writeLayer,
  readPendingDiff,
  writePendingDiff,
  clearPendingDiff,
  listProjects,
  linkPath,
  setRemote,
  projectStorePath,
} from './store/store-manager.js'

export type { InitProjectOptions } from './store/store-manager.js'

// Config
export { readConfig, writeConfig, getTokenBudget } from './store/config-manager.js'

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

export {
  init as gitInit,
  commit as gitCommit,
  log as gitLog,
  restore as gitRestore,
  isDirty as gitIsDirty,
} from './git/git-wrapper.js'

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export { estimateTokens, isWithinBudget, trimToBudget, hardTruncate } from './budget.js'
export type { BudgetSection } from './budget.js'

// ---------------------------------------------------------------------------
// Layer formats
// ---------------------------------------------------------------------------

export { parseContext, serializeContext, formatContextForInjection } from './formats/context-format.js'
export { parseCodebase, serializeCodebase, formatCodebaseForInjection } from './formats/codebase-format.js'
export { parseRules, serializeRules, formatRulesForInjection } from './formats/rules-format.js'
export type { RulesInjectionResult } from './formats/rules-format.js'

// ---------------------------------------------------------------------------
// Diff engine
// ---------------------------------------------------------------------------

export { DiffEngine } from './diff/diff-engine.js'
export {
  mergeDecisions,
  mergeThreads,
  mergeCurrentState,
  mergeSources,
  mergeChanges,
} from './diff/diff-merger.js'

// ---------------------------------------------------------------------------
// Codebase scanner
// ---------------------------------------------------------------------------

export { scan as scanCodebase, generateDraft } from './scanner/codebase-scanner.js'

// ---------------------------------------------------------------------------
// Injection composer
// ---------------------------------------------------------------------------

export { compose } from './injection/injection-composer.js'
export type { ComposeOptions } from './injection/injection-composer.js'

// ---------------------------------------------------------------------------
// Export engine
// ---------------------------------------------------------------------------

export { exportAgentsMd, exportClaudeMd, exportCursorRules } from './export/export-engine.js'

// ---------------------------------------------------------------------------
// Sync manager
// ---------------------------------------------------------------------------

export {
  initRemote as syncInitRemote,
  cloneRemote as syncCloneRemote,
  push as syncPush,
  pull as syncPull,
  sync,
  status as syncStatus,
} from './sync/sync-manager.js'
