import { readPendingDiff, writePendingDiff, DiffEngine, StoreError } from '@mexai/core'
import type { McpToolResult, ContextSource, ContextChanges } from '@mexai/core'
import { resolveMcpProject } from '../utils/resolve.js'

export interface ContextSaveInput {
  workspacePath?: string | undefined
  slug?: string | undefined
  source: ContextSource
  commitMessage: string
  sessionNote?: string | undefined
  changes: ContextChanges
}

export function handleContextSave(input: ContextSaveInput): McpToolResult {
  try {
    const entry = resolveMcpProject(input.workspacePath, input.slug)
    const engine = new DiffEngine()
    const existing = readPendingDiff(entry.slug)
    const diff = existing === undefined
      ? engine.build(entry.slug, input.changes, input.source, input.commitMessage, input.sessionNote)
      : engine.merge(existing, input.changes, input.source, input.commitMessage, input.sessionNote)
    writePendingDiff(entry.slug, diff)
    return {
      success: true,
      data: {
        projectSlug: entry.slug,
        preview: diff.preview,
        staged: true,
        message: 'Changes staged. Run `mexai diff` to review, `mexai commit` to apply.',
      },
    }
  } catch (err) {
    if (err instanceof StoreError) return { success: false, error: err.code, message: err.message }
    return { success: false, error: 'STORE_ERROR', message: err instanceof Error ? err.message : String(err) }
  }
}
