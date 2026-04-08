/**
 * DiffEngine — build, merge, and apply pending diffs.
 *
 * This is the most critical module in the codebase.
 * Every change requires tests for every affected merge rule.
 *
 * - build()  → creates a fresh PendingDiff (no existing diff)
 * - merge()  → merges incoming changes into existing diff (concurrent saves)
 * - apply()  → applies diff to ParsedContext, returns updated markdown string
 *
 * apply() NEVER writes to disk. StoreManager does that.
 */

import type {
  ContextChanges,
  ContextSource,
  PendingDiff,
  DiffPreview,
  ParsedContext,
  ApplyResult,
  ThreadEntry,
  DecisionEntry,
} from '../types.js'
import { serializeContext } from '../formats/context-format.js'
import { mergeSources, mergeChanges } from './diff-merger.js'

// ---------------------------------------------------------------------------
// DiffEngine class
// ---------------------------------------------------------------------------

export class DiffEngine {
  // -------------------------------------------------------------------------
  // build
  // -------------------------------------------------------------------------

  /**
   * Create a fresh `PendingDiff` from proposed changes.
   * Called when there is no existing pending diff for the project.
   */
  build(
    projectSlug: string,
    changes: ContextChanges,
    source: ContextSource,
    commitMessage: string,
    sessionNote?: string | undefined
  ): PendingDiff {
    const now = new Date().toISOString()
    const preview = buildPreview(changes)

    const diff: PendingDiff = {
      projectSlug,
      sources: [source],
      commitMessage,
      changes,
      createdAt: now,
      updatedAt: now,
      preview,
    }
    if (sessionNote !== undefined) {
      diff.sessionNote = sessionNote
    }
    return diff
  }

  // -------------------------------------------------------------------------
  // merge
  // -------------------------------------------------------------------------

  /**
   * Merge incoming changes into an existing pending diff.
   * Called when a second AI save arrives before the developer has committed.
   *
   * Merge rules:
   *   decisions    → append (no dedup)
   *   openThreads  → dedup by content; net-zero cancellation
   *   currentState → last write wins
   *   sources      → union dedup
   *   commitMessage → last write wins
   *   sessionNote  → last write wins (if provided)
   */
  merge(
    existing: PendingDiff,
    incoming: ContextChanges,
    source: ContextSource,
    commitMessage: string,
    sessionNote?: string | undefined
  ): PendingDiff {
    const mergedChanges = mergeChanges(existing.changes, incoming)
    const mergedSources = mergeSources(existing.sources, source)
    const preview = buildPreview(mergedChanges)

    const merged: PendingDiff = {
      projectSlug: existing.projectSlug,
      sources: mergedSources,
      commitMessage,          // last write wins
      changes: mergedChanges,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      preview,
    }
    if (sessionNote !== undefined) {
      merged.sessionNote = sessionNote
    } else if (existing.sessionNote !== undefined) {
      merged.sessionNote = existing.sessionNote
    }
    return merged
  }

  // -------------------------------------------------------------------------
  // apply
  // -------------------------------------------------------------------------

  /**
   * Apply a pending diff to the current parsed context.
   * Returns the updated content as a serialized markdown string + summary.
   *
   * NEVER writes to disk — that is StoreManager's job.
   * Safe to call multiple times (idempotent structure).
   */
  apply(current: ParsedContext, diff: PendingDiff): ApplyResult {
    // Deep clone to avoid mutating the input
    const updated: ParsedContext = {
      frontmatter: {
        ...current.frontmatter,
        updatedAt: new Date().toISOString(),
      },
      identity: current.identity,
      currentState: current.currentState,
      decisions: [...current.decisions],
      openThreads: current.openThreads.map((t) => ({ ...t })),
    }

    const summaryParts: string[] = []

    // Apply decisions — append
    if (diff.changes.decisions && diff.changes.decisions.length > 0) {
      const today = new Date().toISOString().slice(0, 10)
      const newDecisions: DecisionEntry[] = diff.changes.decisions.map((d) => ({
        date: d.date ?? today,
        title: d.title,
        rationale: d.rationale,
      }))
      updated.decisions = [...updated.decisions, ...newDecisions]
      summaryParts.push(
        `Added ${newDecisions.length} decision${newDecisions.length === 1 ? '' : 's'}`
      )
    }

    // Apply open threads
    if (diff.changes.openThreads && diff.changes.openThreads.length > 0) {
      let threadsAdded = 0
      let threadsResolved = 0

      for (const proposed of diff.changes.openThreads) {
        if (proposed.action === 'add') {
          // Only add if not already present (dedup by content)
          const alreadyExists = updated.openThreads.some(
            (t) => t.content === proposed.content && !t.resolved
          )
          if (!alreadyExists) {
            const newThread: ThreadEntry = {
              content: proposed.content,
              resolved: false,
              addedAt: new Date().toISOString().slice(0, 10),
            }
            updated.openThreads.push(newThread)
            threadsAdded++
          }
        } else {
          // check_off — mark matching open thread as resolved
          const thread = updated.openThreads.find(
            (t) => t.content === proposed.content && !t.resolved
          )
          if (thread !== undefined) {
            thread.resolved = true
            threadsResolved++
          } else {
            // Thread doesn't exist as open — create it as already-resolved
            updated.openThreads.push({
              content: proposed.content,
              resolved: true,
              addedAt: new Date().toISOString().slice(0, 10),
            })
            threadsResolved++
          }
        }
      }

      if (threadsAdded > 0) {
        summaryParts.push(`Added ${threadsAdded} thread${threadsAdded === 1 ? '' : 's'}`)
      }
      if (threadsResolved > 0) {
        summaryParts.push(`Resolved ${threadsResolved} thread${threadsResolved === 1 ? '' : 's'}`)
      }
    }

    // Apply currentState — replace
    if (diff.changes.currentState !== undefined && diff.changes.currentState.trim().length > 0) {
      updated.currentState = diff.changes.currentState
      summaryParts.push('Updated current state')
    }

    const summary =
      summaryParts.length > 0
        ? summaryParts.join(', ') + '.'
        : 'No changes applied.'

    return {
      updatedContent: serializeContext(updated),
      summary,
    }
  }
}

// ---------------------------------------------------------------------------
// Preview builder
// ---------------------------------------------------------------------------

function buildPreview(changes: ContextChanges): DiffPreview {
  const decisionsAdded = changes.decisions?.length ?? 0
  const threadsAdded = changes.openThreads?.filter((t) => t.action === 'add').length ?? 0
  const threadsResolved = changes.openThreads?.filter((t) => t.action === 'check_off').length ?? 0
  const currentStateChanged =
    changes.currentState !== undefined && changes.currentState.trim().length > 0

  const parts: string[] = []
  if (decisionsAdded > 0) parts.push(`${decisionsAdded} decision${decisionsAdded === 1 ? '' : 's'}`)
  if (threadsAdded > 0) parts.push(`${threadsAdded} thread${threadsAdded === 1 ? '' : 's'} added`)
  if (threadsResolved > 0) parts.push(`${threadsResolved} thread${threadsResolved === 1 ? '' : 's'} resolved`)
  if (currentStateChanged) parts.push('current state updated')

  return {
    decisionsAdded,
    threadsAdded,
    threadsResolved,
    currentStateChanged,
    summary: parts.length > 0 ? parts.join(', ') : 'No changes',
  }
}
