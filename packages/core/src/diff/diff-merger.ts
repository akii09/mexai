/**
 * Diff merge rule implementations.
 *
 * Each function encodes exactly one merge rule from the spec.
 * See ARCHITECTURE.md §6 and the diff-engine skill for the full rule table.
 *
 * RULES:
 *   decisions      → append, no dedup
 *   openThreads    → dedup by content; net-zero cancellation
 *   currentState   → last write wins
 *   sources        → union dedup
 */

import type { ContextChanges, ProposedDecision, ProposedThread, ContextSource } from '../types.js'

// ---------------------------------------------------------------------------
// Decision merge — APPEND, no dedup
// ---------------------------------------------------------------------------

/**
 * Merge two decision arrays by appending.
 * No dedup — every decision is valid history.
 */
export function mergeDecisions(
  existing: ProposedDecision[] | undefined,
  incoming: ProposedDecision[] | undefined
): ProposedDecision[] | undefined {
  if (!existing?.length && !incoming?.length) return undefined
  return [...(existing ?? []), ...(incoming ?? [])]
}

// ---------------------------------------------------------------------------
// Open threads merge — dedup by content + net-zero cancellation
// ---------------------------------------------------------------------------

/**
 * Merge two open thread arrays using dedup + net-zero cancellation rules.
 *
 * Net-zero: if one side has `add` for content X and the other has `check_off`
 * for the same content X, both are removed (net effect = zero).
 *
 * Dedup: two `add` ops for the same content string → only one kept.
 */
export function mergeThreads(
  existing: ProposedThread[] | undefined,
  incoming: ProposedThread[] | undefined
): ProposedThread[] | undefined {
  const all: ProposedThread[] = [...(existing ?? []), ...(incoming ?? [])]
  if (all.length === 0) return undefined

  // Find all content strings that have BOTH an add and a check_off → cancel both
  const addContents = new Set<string>()
  const checkOffContents = new Set<string>()

  for (const t of all) {
    if (t.action === 'add') addContents.add(t.content)
    else checkOffContents.add(t.content)
  }

  const cancelledContents = new Set<string>(
    [...addContents].filter((c) => checkOffContents.has(c))
  )

  // Remove cancelled pairs entirely
  const afterCancel = all.filter((t) => !cancelledContents.has(t.content))
  if (afterCancel.length === 0) return undefined

  // Dedup adds by content (keep first occurrence)
  const seenAdd = new Set<string>()
  const result: ProposedThread[] = []

  for (const t of afterCancel) {
    if (t.action === 'add') {
      if (!seenAdd.has(t.content)) {
        seenAdd.add(t.content)
        result.push(t)
      }
    } else {
      // check_off — already filtered by cancellation; include as-is
      result.push(t)
    }
  }

  return result.length > 0 ? result : undefined
}

// ---------------------------------------------------------------------------
// Current state merge — LAST WRITE WINS
// ---------------------------------------------------------------------------

/**
 * Merge current state using last-write-wins.
 * undefined incoming does NOT overwrite an existing value.
 */
export function mergeCurrentState(
  existing: string | undefined,
  incoming: string | undefined
): string | undefined {
  if (incoming !== undefined && incoming.trim().length > 0) return incoming
  return existing
}

// ---------------------------------------------------------------------------
// Sources merge — UNION DEDUP
// ---------------------------------------------------------------------------

/**
 * Merge source arrays keeping only unique values.
 */
export function mergeSources(existing: ContextSource[], incoming: ContextSource): ContextSource[] {
  const set = new Set<ContextSource>(existing)
  set.add(incoming)
  return [...set]
}

// ---------------------------------------------------------------------------
// Full changes merge
// ---------------------------------------------------------------------------

/**
 * Merge two `ContextChanges` objects using all merge rules.
 */
export function mergeChanges(
  existing: ContextChanges,
  incoming: ContextChanges
): ContextChanges {
  return {
    decisions: mergeDecisions(existing.decisions, incoming.decisions),
    openThreads: mergeThreads(existing.openThreads, incoming.openThreads),
    currentState: mergeCurrentState(existing.currentState, incoming.currentState),
  }
}
