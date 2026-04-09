/**
 * @mexai/core — Zod validation schemas.
 * All schemas live here. Every external input is validated before touching the store.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const ContextSourceSchema = z.enum([
  'claude-code',
  'cursor',
  'vscode',
  'opencode',
  'manual',
])

export const ProjectStatusSchema = z.enum(['active', 'archived'])

export const LayerSchema = z.enum(['context', 'codebase', 'rules'])

// ---------------------------------------------------------------------------
// Layer 1 types
// ---------------------------------------------------------------------------

export const ContextFrontmatterSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  domain: z.string().min(1, 'Domain is required'),
  stack: z.array(z.string()).min(1, 'At least one stack entry is required'),
  status: ProjectStatusSchema,
  createdAt: z.string().datetime({ message: 'createdAt must be ISO 8601' }),
  updatedAt: z.string().datetime({ message: 'updatedAt must be ISO 8601' }),
})

export const DecisionEntrySchema = z.object({
  date: z.string().min(1),
  title: z.string().min(1, 'Decision title is required'),
  rationale: z.string().min(1, 'Decision rationale is required'),
})

export const ThreadEntrySchema = z.object({
  content: z.string().min(1, 'Thread content is required'),
  resolved: z.boolean(),
  addedAt: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export const ProposedDecisionSchema = z.object({
  title: z.string().min(1, 'Decision title is required'),
  rationale: z.string().min(1, 'Decision rationale is required'),
  date: z.string().optional(),
})

export const ProposedThreadSchema = z.object({
  action: z.enum(['add', 'check_off']),
  content: z.string().min(1, 'Thread content is required'),
})

export const ContextChangesSchema = z
  .object({
    decisions: z.array(ProposedDecisionSchema).optional(),
    openThreads: z.array(ProposedThreadSchema).optional(),
    currentState: z.string().optional(),
  })
  .refine(
    (val) =>
      val.decisions !== undefined ||
      val.openThreads !== undefined ||
      val.currentState !== undefined,
    { message: 'At least one change field is required' }
  )

// ---------------------------------------------------------------------------
// Pending diff
// ---------------------------------------------------------------------------

export const DiffPreviewSchema = z.object({
  decisionsAdded: z.number().int().nonnegative(),
  threadsAdded: z.number().int().nonnegative(),
  threadsResolved: z.number().int().nonnegative(),
  currentStateChanged: z.boolean(),
  summary: z.string(),
})

export const PendingDiffSchema = z.object({
  projectSlug: z.string().min(1),
  sources: z.array(ContextSourceSchema).min(1),
  commitMessage: z
    .string()
    .min(1)
    .max(72, 'Commit message must be 72 characters or fewer'),
  sessionNote: z.string().optional(),
  changes: ContextChangesSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  preview: DiffPreviewSchema,
})

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const RegistryEntrySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  remote: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const MexaiRegistrySchema = z.object({
  version: z.literal(1),
  entries: z.array(RegistryEntrySchema),
})

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const TokenBudgetConfigSchema = z.object({
  context: z.number().int().positive().default(250),
  codebase: z.number().int().positive().default(300),
  rules: z.number().int().positive().default(150),
  total: z.number().int().positive().default(700),
})

export const MexaiConfigSchema = z.object({
  version: z.literal(1),
  tokenBudget: TokenBudgetConfigSchema,
  githubToken: z.string().optional(),
})

// ---------------------------------------------------------------------------
// CLI init options
// ---------------------------------------------------------------------------

export const InitOptionsSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  domain: z.string().min(1, 'Domain is required'),
  stack: z.array(z.string()).min(1),
  identity: z.string().min(1),
  currentState: z.string().min(1),
  skipRules: z.boolean().default(false),
})

// ---------------------------------------------------------------------------
// MCP tool input schemas
// ---------------------------------------------------------------------------

export const ContextReadInputSchema = z.object({
  workspacePath: z.string().optional(),
  slug: z.string().optional(),
  layers: z.array(LayerSchema).optional(),
  maxTokens: z.number().int().positive().optional(),
})

export const ContextSaveInputSchema = z.object({
  workspacePath: z.string().optional(),
  slug: z.string().optional(),
  source: ContextSourceSchema,
  commitMessage: z
    .string()
    .min(1)
    .max(72, 'Commit message must be 72 characters or fewer'),
  sessionNote: z.string().optional(),
  changes: ContextChangesSchema,
  dryRun: z.boolean().optional(),
})

export const CodebaseReadInputSchema = z.object({
  workspacePath: z.string().optional(),
  slug: z.string().optional(),
  section: z
    .enum(['all', 'structure', 'keyFiles', 'conventions', 'patterns', 'doNotTouch'])
    .default('all'),
})

export const RulesReadInputSchema = z.object({
  workspacePath: z.string().optional(),
  slug: z.string().optional(),
})

export const ContextListInputSchema = z.object({})
