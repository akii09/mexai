import { readPendingDiff, writePendingDiff, DiffEngine, StoreError, readLayer, parseContext } from '@mexai/core'
import type { McpToolResult, ContextSource, ContextChanges, Layer } from '@mexai/core'
import { resolveMcpProject } from '../utils/resolve.js'

export interface ContextSaveInput {
  workspacePath?: string | undefined
  slug?: string | undefined
  source: ContextSource
  commitMessage: string
  sessionNote?: string | undefined
  changes: ContextChanges
  dryRun?: boolean | undefined
}

export function handleContextSave(input: ContextSaveInput): McpToolResult {
  try {
    const entry = resolveMcpProject(input.workspacePath, input.slug)

    // Idempotency: skip decisions already committed (match by title, case-insensitive)
    let changes = input.changes
    let skippedDecisions = 0
    if (changes.decisions !== undefined && changes.decisions.length > 0) {
      const raw = safeReadLayer(entry.slug, 'context')
      if (raw !== null) {
        const ctx = parseContext(raw, { slug: entry.slug, name: entry.name })
        const existingTitles = new Set(ctx.decisions.map((d) => d.title.toLowerCase().trim()))
        const deduped = changes.decisions.filter(
          (d) => !existingTitles.has(d.title.toLowerCase().trim())
        )
        skippedDecisions = changes.decisions.length - deduped.length
        changes = { ...changes, decisions: deduped }
      }
    }

    const hasChanges =
      (changes.decisions?.length ?? 0) > 0 ||
      (changes.openThreads?.length ?? 0) > 0 ||
      changes.currentState !== undefined

    const engine = new DiffEngine()
    const existing = readPendingDiff(entry.slug)
    const diff =
      existing === undefined
        ? engine.build(entry.slug, changes, input.source, input.commitMessage, input.sessionNote)
        : engine.merge(existing, changes, input.source, input.commitMessage, input.sessionNote)

    if (input.dryRun !== true) {
      writePendingDiff(entry.slug, diff)
    }

    return {
      success: true,
      data: {
        projectSlug: entry.slug,
        preview: diff.preview,
        staged: input.dryRun !== true,
        dryRun: input.dryRun === true,
        hasChanges,
        skippedDuplicateDecisions: skippedDecisions,
        message:
          input.dryRun === true
            ? 'Dry run — no changes staged. Review the preview above.'
            : 'Changes staged in pending-diff. Run `mexai diff` to review, `mexai commit` to apply.',
        important: 'pending-diff is NOT committed. Use context_read to see the currently committed context.',
        committedSnapshot: buildCommittedSnapshot(entry.slug, entry.name),
      },
    }
  } catch (err) {
    if (err instanceof StoreError) return { success: false, error: err.code, message: err.message }
    return { success: false, error: 'STORE_ERROR', message: err instanceof Error ? err.message : String(err) }
  }
}

function safeReadLayer(slug: string, layer: Layer): string | null {
  try {
    return readLayer(slug, layer)
  } catch {
    return null
  }
}

function buildCommittedSnapshot(slug: string, name: string): Record<string, unknown> | null {
  try {
    const raw = safeReadLayer(slug, 'context')
    if (raw === null) return null
    const ctx = parseContext(raw, { slug, name })
    return {
      identity: ctx.identity.slice(0, 300),
      currentState: ctx.currentState.slice(0, 300),
      decisionsCount: ctx.decisions.length,
      openThreadsCount: ctx.openThreads.filter((t) => !t.resolved).length,
      lastDecisionTitle:
        ctx.decisions.length > 0
          ? (ctx.decisions[ctx.decisions.length - 1]?.title ?? null)
          : null,
    }
  } catch {
    return null
  }
}
