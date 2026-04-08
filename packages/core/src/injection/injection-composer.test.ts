import { describe, it, expect, vi, beforeEach } from 'vitest'
import { compose } from './injection-composer.js'

// ---------------------------------------------------------------------------
// Mock store and config
// ---------------------------------------------------------------------------

vi.mock('../store/store-manager.js', () => ({
  readLayer: vi.fn(),
}))

vi.mock('../store/config-manager.js', () => ({
  getTokenBudget: vi.fn(() => ({
    context: 250,
    codebase: 300,
    rules: 150,
    total: 700,
  })),
}))

import { readLayer } from '../store/store-manager.js'

const MOCK_CONTEXT = `---
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

Working well.

## Decisions

## Open Threads

`

const MOCK_CODEBASE = `# Codebase Map

## Structure

src/

## Key Files

- \`src/index.ts\` — entry point

## Conventions

- TypeScript strict mode

## Patterns

## Do Not Touch

`

const MOCK_RULES = `# Agent Rules

## Code Quality

- Write tests for all new code

## Security

- Validate all inputs
`

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InjectionComposer.compose', () => {
  beforeEach(() => {
    vi.mocked(readLayer).mockImplementation((_slug: string, layer: string) => {
      if (layer === 'context') return MOCK_CONTEXT
      if (layer === 'codebase') return MOCK_CODEBASE
      if (layer === 'rules') return MOCK_RULES
      return ''
    })
  })

  it('returns InjectionPayload with text, tokensUsed, and layerBreakdown', async () => {
    const payload = await compose('test-project')

    expect(payload.text.length).toBeGreaterThan(0)
    expect(payload.tokensUsed).toBeGreaterThan(0)
    expect(payload.layerBreakdown.context).toBeGreaterThan(0)
    expect(payload.layerBreakdown.codebase).toBeGreaterThan(0)
    expect(payload.layerBreakdown.rules).toBeGreaterThan(0)
  })

  it('includes all three layers in order (rules → context → codebase)', async () => {
    const payload = await compose('test-project')

    const rulesIdx = payload.text.indexOf('Agent Rules')
    const contextIdx = payload.text.indexOf('Test Project')
    const codebaseIdx = payload.text.indexOf('Codebase Map')

    expect(rulesIdx).toBeLessThan(contextIdx)
    expect(contextIdx).toBeLessThan(codebaseIdx)
  })

  it('respects the layers filter — context only', async () => {
    const payload = await compose('test-project', { layers: ['context'] })

    expect(payload.text).toContain('Test Project')
    expect(payload.text).not.toContain('Agent Rules')
    expect(payload.text).not.toContain('Codebase Map')
    expect(payload.layerBreakdown.rules).toBe(0)
    expect(payload.layerBreakdown.codebase).toBe(0)
  })

  it('respects the layers filter — rules only', async () => {
    const payload = await compose('test-project', { layers: ['rules'] })

    expect(payload.text).toContain('Agent Rules')
    expect(payload.text).not.toContain('Codebase Map')
    expect(payload.layerBreakdown.context).toBe(0)
    expect(payload.layerBreakdown.codebase).toBe(0)
  })

  it('layerBreakdown tokens sum close to tokensUsed', async () => {
    const payload = await compose('test-project')
    const breakdownSum =
      payload.layerBreakdown.context +
      payload.layerBreakdown.codebase +
      payload.layerBreakdown.rules

    // Total includes separators, so allow some tolerance
    expect(payload.tokensUsed).toBeGreaterThanOrEqual(breakdownSum - 5)
  })

  it('handles missing layers gracefully (LAYER_NOT_INITIALIZED)', async () => {
    const { StoreError } = await import('../types.js')
    vi.mocked(readLayer).mockImplementation((_slug: string, layer: string) => {
      if (layer === 'codebase') throw new StoreError('LAYER_NOT_INITIALIZED', 'not init')
      if (layer === 'context') return MOCK_CONTEXT
      if (layer === 'rules') return MOCK_RULES
      return ''
    })

    const payload = await compose('test-project')
    // Should still return context and rules without codebase
    expect(payload.text).toContain('Test Project')
    expect(payload.layerBreakdown.codebase).toBe(0)
  })

  it('respects maxTokens override', async () => {
    const payload = await compose('test-project', { maxTokens: 100 })
    // tokensUsed should be small — layers trimmed to fit
    expect(payload.tokensUsed).toBeLessThanOrEqual(200) // rough bound
  })
})
