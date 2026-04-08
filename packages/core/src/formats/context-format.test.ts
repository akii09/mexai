import { describe, it, expect } from 'vitest'
import { parseContext, serializeContext, formatContextForInjection } from './context-format.js'
import type { ParsedContext } from '../types.js'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_CONTEXT_MD = `---
name: Test Project
slug: test-project
domain: web
stack:
  - TypeScript
  - React
status: active
createdAt: "2026-04-09T10:00:00.000Z"
updatedAt: "2026-04-09T10:00:00.000Z"
---

## Identity

A test project for unit testing.

## Current State

Implementing Phase 2.

## Decisions

### 2026-04-09: Chose Vitest

ESM-native and faster than Jest.

### 2026-04-08: Chose TypeScript

Strong type safety from day one.

## Open Threads

- [ ] Document test patterns <!-- 2026-04-09 -->
- [x] Set up monorepo <!-- 2026-04-08 -->
`

const MINIMAL_CONTEXT_MD = `---
name: Minimal
slug: minimal
domain: tools
stack:
  - Node.js
status: active
createdAt: "2026-04-09T10:00:00.000Z"
updatedAt: "2026-04-09T10:00:00.000Z"
---

## Identity

Minimal project.

## Current State

Just started.

## Decisions

## Open Threads

`

// ---------------------------------------------------------------------------
// parse
// ---------------------------------------------------------------------------

describe('parseContext', () => {
  it('parses frontmatter fields correctly', () => {
    const ctx = parseContext(VALID_CONTEXT_MD)
    expect(ctx.frontmatter.name).toBe('Test Project')
    expect(ctx.frontmatter.slug).toBe('test-project')
    expect(ctx.frontmatter.domain).toBe('web')
    expect(ctx.frontmatter.stack).toEqual(['TypeScript', 'React'])
    expect(ctx.frontmatter.status).toBe('active')
  })

  it('parses identity section', () => {
    const ctx = parseContext(VALID_CONTEXT_MD)
    expect(ctx.identity).toContain('A test project for unit testing')
  })

  it('parses current state section', () => {
    const ctx = parseContext(VALID_CONTEXT_MD)
    expect(ctx.currentState).toContain('Implementing Phase 2')
  })

  it('parses decisions with date, title, and rationale', () => {
    const ctx = parseContext(VALID_CONTEXT_MD)
    expect(ctx.decisions).toHaveLength(2)
    expect(ctx.decisions[0]?.date).toBe('2026-04-09')
    expect(ctx.decisions[0]?.title).toBe('Chose Vitest')
    expect(ctx.decisions[0]?.rationale).toContain('ESM-native')
    expect(ctx.decisions[1]?.date).toBe('2026-04-08')
    expect(ctx.decisions[1]?.title).toBe('Chose TypeScript')
  })

  it('parses open threads with resolved status', () => {
    const ctx = parseContext(VALID_CONTEXT_MD)
    expect(ctx.openThreads).toHaveLength(2)
    const pending = ctx.openThreads.find((t) => !t.resolved)
    const resolved = ctx.openThreads.find((t) => t.resolved)
    expect(pending?.content).toBe('Document test patterns')
    expect(resolved?.content).toBe('Set up monorepo')
  })

  it('handles empty decisions section', () => {
    const ctx = parseContext(MINIMAL_CONTEXT_MD)
    expect(ctx.decisions).toHaveLength(0)
  })

  it('handles empty threads section', () => {
    const ctx = parseContext(MINIMAL_CONTEXT_MD)
    expect(ctx.openThreads).toHaveLength(0)
  })

  it('throws StoreError when frontmatter is missing required fields', () => {
    const bad = `---
name: Missing Slug
status: active
---

## Identity

test
`
    expect(() => parseContext(bad)).toThrow('context.md has invalid frontmatter')
  })
})

// ---------------------------------------------------------------------------
// serialize
// ---------------------------------------------------------------------------

describe('serializeContext', () => {
  it('roundtrip: parse → serialize → parse produces equivalent context', () => {
    const original = parseContext(VALID_CONTEXT_MD)
    const serialized = serializeContext(original)
    const roundtripped = parseContext(serialized)

    expect(roundtripped.frontmatter).toEqual(original.frontmatter)
    expect(roundtripped.identity.trim()).toBe(original.identity.trim())
    expect(roundtripped.currentState.trim()).toBe(original.currentState.trim())
    expect(roundtripped.decisions).toHaveLength(original.decisions.length)
    expect(roundtripped.openThreads).toHaveLength(original.openThreads.length)
  })

  it('preserves decision content after roundtrip', () => {
    const original = parseContext(VALID_CONTEXT_MD)
    const serialized = serializeContext(original)
    const roundtripped = parseContext(serialized)

    for (let i = 0; i < original.decisions.length; i++) {
      expect(roundtripped.decisions[i]?.title).toBe(original.decisions[i]?.title)
      expect(roundtripped.decisions[i]?.rationale).toBe(original.decisions[i]?.rationale)
    }
  })

  it('preserves thread resolved status after roundtrip', () => {
    const original = parseContext(VALID_CONTEXT_MD)
    const serialized = serializeContext(original)
    const roundtripped = parseContext(serialized)

    const originalResolved = original.openThreads.filter((t) => t.resolved).map((t) => t.content)
    const roundtrippedResolved = roundtripped.openThreads.filter((t) => t.resolved).map((t) => t.content)
    expect(roundtrippedResolved).toEqual(originalResolved)
  })

  it('handles unicode in project names and content', () => {
    const original = parseContext(VALID_CONTEXT_MD)
    const withUnicode: ParsedContext = {
      ...original,
      identity: 'This project uses 日本語 and emojis 🚀',
      currentState: 'État actuel: en cours',
    }
    const serialized = serializeContext(withUnicode)
    const roundtripped = parseContext(serialized)
    expect(roundtripped.identity).toContain('日本語')
    expect(roundtripped.currentState).toContain('État actuel')
  })
})

// ---------------------------------------------------------------------------
// formatContextForInjection
// ---------------------------------------------------------------------------

describe('formatContextForInjection', () => {
  it('stays within the token budget', () => {
    const ctx = parseContext(VALID_CONTEXT_MD)
    // Add many long decisions to force truncation
    const manyDecisions: ParsedContext = {
      ...ctx,
      decisions: Array.from({ length: 50 }, (_, i) => ({
        date: '2026-04-09',
        title: `Decision ${i}`,
        rationale: 'x'.repeat(200),
      })),
    }
    const budget = 250
    const result = formatContextForInjection(manyDecisions, budget)
    // 250 tokens ≈ 1000 chars; allow some overhead for headers
    expect(result.length).toBeLessThanOrEqual(budget * 4 + 100)
  })

  it('always includes identity and current state (highest priority)', () => {
    const ctx = parseContext(VALID_CONTEXT_MD)
    const result = formatContextForInjection(ctx, 500)
    expect(result).toContain('A test project for unit testing')
    expect(result).toContain('Implementing Phase 2')
  })

  it('includes project name in output', () => {
    const ctx = parseContext(VALID_CONTEXT_MD)
    const result = formatContextForInjection(ctx, 500)
    expect(result).toContain('Test Project')
  })

  it('only shows open (unresolved) threads', () => {
    const ctx = parseContext(VALID_CONTEXT_MD)
    const result = formatContextForInjection(ctx, 500)
    expect(result).toContain('Document test patterns')
    expect(result).not.toContain('Set up monorepo') // resolved — excluded
  })
})
