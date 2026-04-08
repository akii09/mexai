import { describe, it, expect, beforeEach } from 'vitest'
import { DiffEngine } from './diff-engine.js'
import { parseContext } from '../formats/context-format.js'
import type { PendingDiff, ContextChanges, ParsedContext } from '../types.js'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BASE_CONTEXT_MD = `---
name: Test Project
slug: test-project
domain: web
stack:
  - TypeScript
status: active
createdAt: "2026-04-09T10:00:00.000Z"
updatedAt: "2026-04-09T10:00:00.000Z"
---

## Identity

A test project.

## Current State

Initial state.

## Decisions

## Open Threads

- [ ] Existing open thread <!-- 2026-04-09 -->
`

const DECISIONS_ONLY: ContextChanges = {
  decisions: [{ title: 'Chose Vitest', rationale: 'ESM-native and faster than Jest' }],
}

const THREADS_ADD_ONLY: ContextChanges = {
  openThreads: [{ action: 'add', content: 'Document test patterns' }],
}

const CURRENT_STATE_ONLY: ContextChanges = {
  currentState: 'Implementing tests',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEngine(): DiffEngine {
  return new DiffEngine()
}

function baseCtx(): ParsedContext {
  return parseContext(BASE_CONTEXT_MD)
}

// ---------------------------------------------------------------------------
// DiffEngine.build
// ---------------------------------------------------------------------------

describe('DiffEngine.build', () => {
  let engine: DiffEngine

  beforeEach(() => {
    engine = makeEngine()
  })

  it('produces correct PendingDiff structure', () => {
    const diff = engine.build('test-project', DECISIONS_ONLY, 'cursor', 'Add Vitest decision')

    expect(diff.projectSlug).toBe('test-project')
    expect(diff.sources).toEqual(['cursor'])
    expect(diff.commitMessage).toBe('Add Vitest decision')
    expect(diff.changes.decisions).toHaveLength(1)
    expect(diff.changes.decisions?.[0]?.title).toBe('Chose Vitest')
  })

  it('populates preview counts correctly', () => {
    const changes: ContextChanges = {
      decisions: [
        { title: 'D1', rationale: 'r1' },
        { title: 'D2', rationale: 'r2' },
      ],
      openThreads: [
        { action: 'add', content: 'Thread A' },
        { action: 'check_off', content: 'Thread B' },
      ],
      currentState: 'New state',
    }
    const diff = engine.build('slug', changes, 'claude-code', 'msg')

    expect(diff.preview.decisionsAdded).toBe(2)
    expect(diff.preview.threadsAdded).toBe(1)
    expect(diff.preview.threadsResolved).toBe(1)
    expect(diff.preview.currentStateChanged).toBe(true)
  })

  it('sets createdAt and updatedAt to current ISO datetime', () => {
    const before = Date.now()
    const diff = engine.build('slug', DECISIONS_ONLY, 'cursor', 'msg')
    const after = Date.now()

    const created = new Date(diff.createdAt).getTime()
    expect(created).toBeGreaterThanOrEqual(before)
    expect(created).toBeLessThanOrEqual(after)
    expect(diff.createdAt).toBe(diff.updatedAt)
  })

  it('handles empty decisions array', () => {
    const diff = engine.build('slug', { currentState: 'Ready' }, 'cursor', 'msg')
    expect(diff.changes.decisions).toBeUndefined()
    expect(diff.preview.decisionsAdded).toBe(0)
  })

  it('includes sessionNote when provided', () => {
    const diff = engine.build('slug', DECISIONS_ONLY, 'cursor', 'msg', 'Session context here')
    expect(diff.sessionNote).toBe('Session context here')
  })

  it('omits sessionNote when not provided', () => {
    const diff = engine.build('slug', DECISIONS_ONLY, 'cursor', 'msg')
    expect(diff.sessionNote).toBeUndefined()
  })

  it('preview.summary is non-empty when changes exist', () => {
    const diff = engine.build('slug', DECISIONS_ONLY, 'cursor', 'msg')
    expect(diff.preview.summary).not.toBe('No changes')
    expect(diff.preview.summary.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// DiffEngine.merge — decisions
// ---------------------------------------------------------------------------

describe('DiffEngine.merge — decisions', () => {
  let engine: DiffEngine
  let first: PendingDiff

  beforeEach(() => {
    engine = makeEngine()
    first = engine.build('slug', DECISIONS_ONLY, 'cursor', 'First save')
  })

  it('appends decisions from second save', () => {
    const merged = engine.merge(
      first,
      { decisions: [{ title: 'Second Decision', rationale: 'reason' }] },
      'claude-code',
      'Second save'
    )

    expect(merged.changes.decisions).toHaveLength(2)
    expect(merged.changes.decisions?.[0]?.title).toBe('Chose Vitest')
    expect(merged.changes.decisions?.[1]?.title).toBe('Second Decision')
  })

  it('appends decisions from third save (n saves)', () => {
    const second = engine.merge(
      first,
      { decisions: [{ title: 'D2', rationale: 'r2' }] },
      'claude-code',
      'msg'
    )
    const third = engine.merge(
      second,
      { decisions: [{ title: 'D3', rationale: 'r3' }] },
      'cursor',
      'msg'
    )

    expect(third.changes.decisions).toHaveLength(3)
    expect(third.changes.decisions?.[2]?.title).toBe('D3')
  })

  it('does NOT dedup decisions with same title', () => {
    const duplicate = { decisions: [{ title: 'Chose Vitest', rationale: 'Same title, different session' }] }
    const merged = engine.merge(first, duplicate, 'claude-code', 'msg')

    expect(merged.changes.decisions).toHaveLength(2)
    expect(merged.changes.decisions?.[0]?.title).toBe('Chose Vitest')
    expect(merged.changes.decisions?.[1]?.title).toBe('Chose Vitest')
  })
})

// ---------------------------------------------------------------------------
// DiffEngine.merge — openThreads
// ---------------------------------------------------------------------------

describe('DiffEngine.merge — openThreads', () => {
  let engine: DiffEngine

  beforeEach(() => {
    engine = makeEngine()
  })

  it('deduplicates add operations by exact content string', () => {
    const first = engine.build(
      'slug',
      { openThreads: [{ action: 'add', content: 'Fix auth bug' }] },
      'cursor',
      'msg'
    )
    const merged = engine.merge(
      first,
      { openThreads: [{ action: 'add', content: 'Fix auth bug' }] },
      'claude-code',
      'msg'
    )

    const adds = merged.changes.openThreads?.filter((t) => t.action === 'add') ?? []
    expect(adds).toHaveLength(1)
    expect(adds[0]?.content).toBe('Fix auth bug')
  })

  it('does not dedup adds with different content', () => {
    const first = engine.build(
      'slug',
      { openThreads: [{ action: 'add', content: 'Fix auth bug' }] },
      'cursor',
      'msg'
    )
    const merged = engine.merge(
      first,
      { openThreads: [{ action: 'add', content: 'Add rate limiting' }] },
      'claude-code',
      'msg'
    )

    const adds = merged.changes.openThreads?.filter((t) => t.action === 'add') ?? []
    expect(adds).toHaveLength(2)
  })

  it('net-zero: check_off cancels a pending add (same content)', () => {
    const first = engine.build(
      'slug',
      { openThreads: [{ action: 'add', content: 'Fix auth bug' }] },
      'cursor',
      'msg'
    )
    const merged = engine.merge(
      first,
      { openThreads: [{ action: 'check_off', content: 'Fix auth bug' }] },
      'claude-code',
      'msg'
    )

    // Both cancelled — net zero
    expect(merged.changes.openThreads?.length ?? 0).toBe(0)
  })

  it('net-zero: add cancels a pending check_off (same content)', () => {
    const first = engine.build(
      'slug',
      { openThreads: [{ action: 'check_off', content: 'Existing open thread' }] },
      'cursor',
      'msg'
    )
    const merged = engine.merge(
      first,
      { openThreads: [{ action: 'add', content: 'Existing open thread' }] },
      'claude-code',
      'msg'
    )

    expect(merged.changes.openThreads?.length ?? 0).toBe(0)
  })

  it('net-zero only affects matching content — different content survives', () => {
    const first = engine.build(
      'slug',
      {
        openThreads: [
          { action: 'add', content: 'Fix auth bug' },
          { action: 'add', content: 'Unrelated thread' },
        ],
      },
      'cursor',
      'msg'
    )
    const merged = engine.merge(
      first,
      { openThreads: [{ action: 'check_off', content: 'Fix auth bug' }] },
      'claude-code',
      'msg'
    )

    // Only 'Fix auth bug' cancelled; 'Unrelated thread' survives
    const threads = merged.changes.openThreads ?? []
    expect(threads).toHaveLength(1)
    expect(threads[0]?.content).toBe('Unrelated thread')
  })
})

// ---------------------------------------------------------------------------
// DiffEngine.merge — currentState
// ---------------------------------------------------------------------------

describe('DiffEngine.merge — currentState', () => {
  let engine: DiffEngine

  beforeEach(() => {
    engine = makeEngine()
  })

  it('last write wins — incoming replaces existing', () => {
    const first = engine.build('slug', { currentState: 'First state' }, 'cursor', 'msg')
    const merged = engine.merge(first, { currentState: 'Second state' }, 'claude-code', 'msg')

    expect(merged.changes.currentState).toBe('Second state')
  })

  it('undefined incoming does NOT overwrite existing', () => {
    const first = engine.build('slug', { currentState: 'First state' }, 'cursor', 'msg')
    const merged = engine.merge(first, { decisions: [{ title: 'D', rationale: 'r' }] }, 'claude-code', 'msg')

    expect(merged.changes.currentState).toBe('First state')
  })

  it('empty string incoming does NOT overwrite existing', () => {
    const first = engine.build('slug', { currentState: 'First state' }, 'cursor', 'msg')
    const merged = engine.merge(first, { currentState: '   ' }, 'claude-code', 'msg')

    expect(merged.changes.currentState).toBe('First state')
  })
})

// ---------------------------------------------------------------------------
// DiffEngine.merge — sources
// ---------------------------------------------------------------------------

describe('DiffEngine.merge — sources', () => {
  let engine: DiffEngine

  beforeEach(() => {
    engine = makeEngine()
  })

  it('deduplicates identical sources', () => {
    const first = engine.build('slug', DECISIONS_ONLY, 'cursor', 'msg')
    const merged = engine.merge(first, DECISIONS_ONLY, 'cursor', 'msg')

    expect(merged.sources).toEqual(['cursor'])
  })

  it('unions different sources', () => {
    const first = engine.build('slug', DECISIONS_ONLY, 'cursor', 'msg')
    const merged = engine.merge(first, DECISIONS_ONLY, 'claude-code', 'msg')

    expect(merged.sources).toContain('cursor')
    expect(merged.sources).toContain('claude-code')
    expect(merged.sources).toHaveLength(2)
  })

  it('accumulates sources across three saves', () => {
    const first = engine.build('slug', DECISIONS_ONLY, 'cursor', 'msg')
    const second = engine.merge(first, DECISIONS_ONLY, 'claude-code', 'msg')
    const third = engine.merge(second, DECISIONS_ONLY, 'vscode', 'msg')

    expect(third.sources).toHaveLength(3)
    expect(third.sources).toContain('cursor')
    expect(third.sources).toContain('claude-code')
    expect(third.sources).toContain('vscode')
  })
})

// ---------------------------------------------------------------------------
// DiffEngine.apply
// ---------------------------------------------------------------------------

describe('DiffEngine.apply', () => {
  let engine: DiffEngine
  let ctx: ParsedContext

  beforeEach(() => {
    engine = makeEngine()
    ctx = baseCtx()
  })

  it('appends decisions to ## Decisions section', () => {
    const diff = engine.build('slug', DECISIONS_ONLY, 'cursor', 'msg')
    const result = engine.apply(ctx, diff)

    const updated = parseContext(result.updatedContent)
    expect(updated.decisions).toHaveLength(1)
    expect(updated.decisions[0]?.title).toBe('Chose Vitest')
    expect(updated.decisions[0]?.rationale).toContain('ESM-native')
  })

  it('adds new threads to ## Open Threads', () => {
    const diff = engine.build('slug', THREADS_ADD_ONLY, 'cursor', 'msg')
    const result = engine.apply(ctx, diff)

    const updated = parseContext(result.updatedContent)
    const newThread = updated.openThreads.find((t) => t.content === 'Document test patterns')
    expect(newThread).toBeDefined()
    expect(newThread?.resolved).toBe(false)
  })

  it('marks threads as resolved ([x]) in ## Open Threads', () => {
    const checkOff: ContextChanges = {
      openThreads: [{ action: 'check_off', content: 'Existing open thread' }],
    }
    const diff = engine.build('slug', checkOff, 'cursor', 'msg')
    const result = engine.apply(ctx, diff)

    const updated = parseContext(result.updatedContent)
    const resolved = updated.openThreads.find((t) => t.content === 'Existing open thread')
    expect(resolved?.resolved).toBe(true)
  })

  it('replaces ## Current State content', () => {
    const diff = engine.build('slug', CURRENT_STATE_ONLY, 'cursor', 'msg')
    const result = engine.apply(ctx, diff)

    const updated = parseContext(result.updatedContent)
    expect(updated.currentState).toContain('Implementing tests')
  })

  it('does not modify frontmatter name/slug/domain', () => {
    const diff = engine.build('slug', DECISIONS_ONLY, 'cursor', 'msg')
    const result = engine.apply(ctx, diff)

    const updated = parseContext(result.updatedContent)
    expect(updated.frontmatter.name).toBe(ctx.frontmatter.name)
    expect(updated.frontmatter.slug).toBe(ctx.frontmatter.slug)
    expect(updated.frontmatter.domain).toBe(ctx.frontmatter.domain)
  })

  it('does not modify ## Identity section', () => {
    const diff = engine.build('slug', DECISIONS_ONLY, 'cursor', 'msg')
    const result = engine.apply(ctx, diff)

    const updated = parseContext(result.updatedContent)
    expect(updated.identity.trim()).toBe(ctx.identity.trim())
  })

  it('is idempotent — applying same diff twice produces valid structure', () => {
    const diff = engine.build('slug', DECISIONS_ONLY, 'cursor', 'msg')

    const first = engine.apply(ctx, diff)
    const firstCtx = parseContext(first.updatedContent)

    const second = engine.apply(firstCtx, diff)
    const secondCtx = parseContext(second.updatedContent)

    // Both applications produce parseable, valid context
    expect(secondCtx.frontmatter.name).toBe(ctx.frontmatter.name)
    expect(secondCtx.decisions.length).toBeGreaterThan(0)
  })

  it('returns a non-empty summary string', () => {
    const diff = engine.build('slug', DECISIONS_ONLY, 'cursor', 'msg')
    const result = engine.apply(ctx, diff)
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('summary mentions what changed', () => {
    const changes: ContextChanges = {
      decisions: [{ title: 'D1', rationale: 'r1' }],
      currentState: 'New state',
    }
    const diff = engine.build('slug', changes, 'cursor', 'msg')
    const result = engine.apply(ctx, diff)
    expect(result.summary.toLowerCase()).toContain('decision')
    expect(result.summary.toLowerCase()).toContain('state')
  })

  it('updatedContent is valid context.md (parseable)', () => {
    const diff = engine.build('slug', {
      decisions: [{ title: 'D', rationale: 'r' }],
      openThreads: [{ action: 'add', content: 'New thread' }],
      currentState: 'Updated',
    }, 'cursor', 'msg')

    const result = engine.apply(ctx, diff)
    expect(() => parseContext(result.updatedContent)).not.toThrow()
  })

  it('concurrent saves — three builds then applies merge correctly', () => {
    const first = engine.build(
      'slug',
      { decisions: [{ title: 'D1', rationale: 'r1' }] },
      'cursor',
      'First save'
    )
    const second = engine.merge(
      first,
      { decisions: [{ title: 'D2', rationale: 'r2' }] },
      'claude-code',
      'Second save'
    )
    const third = engine.merge(
      second,
      { currentState: 'All three merged' },
      'vscode',
      'Third save'
    )

    const result = engine.apply(ctx, third)
    const updated = parseContext(result.updatedContent)

    expect(updated.decisions).toHaveLength(2)
    expect(updated.currentState).toContain('All three merged')
    expect(third.sources).toHaveLength(3)
  })
})
