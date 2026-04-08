/**
 * @mexai/core — public API.
 * All types, schemas, and domain modules exported from here.
 */

// Types
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

// Schemas
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

// Store
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
} from './store/store-manager.js'

export type { InitProjectOptions } from './store/store-manager.js'

// Config
export { readConfig, writeConfig, getTokenBudget } from './store/config-manager.js'

// Git
export {
  init as gitInit,
  commit as gitCommit,
  log as gitLog,
  restore as gitRestore,
  isDirty as gitIsDirty,
} from './git/git-wrapper.js'
