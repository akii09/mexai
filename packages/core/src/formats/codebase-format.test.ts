import { describe, it, expect } from 'vitest'
import { parseCodebase, serializeCodebase, formatCodebaseForInjection } from './codebase-format.js'

const VALID_CODEBASE_MD = `# Codebase Map

## Structure

\`\`\`
src/
  index.ts
  utils/
    helpers.ts
\`\`\`

## Key Files

- \`src/index.ts\` — main entry point
- \`src/utils/helpers.ts\` — shared utilities

## Conventions

- Use named exports everywhere
- Co-locate tests with source files

## Patterns

- Functional composition over class inheritance

## Do Not Touch

- \`dist/\` — generated output
`

describe('parseCodebase', () => {
  it('parses all sections', () => {
    const cb = parseCodebase(VALID_CODEBASE_MD)
    expect(cb.structure).toContain('src/')
    expect(cb.keyFiles).toContain('index.ts')
    expect(cb.conventions).toContain('named exports')
    expect(cb.patterns).toContain('Functional')
    expect(cb.doNotTouch).toContain('dist/')
  })

  it('handles missing sections gracefully', () => {
    const minimal = `# Codebase Map\n\n## Structure\n\nsome structure\n`
    const cb = parseCodebase(minimal)
    expect(cb.structure).toContain('some structure')
    expect(cb.keyFiles).toBe('')
    expect(cb.conventions).toBe('')
  })
})

describe('serializeCodebase', () => {
  it('roundtrip: parse → serialize → parse produces equivalent codebase', () => {
    const original = parseCodebase(VALID_CODEBASE_MD)
    const serialized = serializeCodebase(original)
    const roundtripped = parseCodebase(serialized)

    expect(roundtripped.structure.trim()).toBe(original.structure.trim())
    expect(roundtripped.keyFiles.trim()).toBe(original.keyFiles.trim())
    expect(roundtripped.conventions.trim()).toBe(original.conventions.trim())
    expect(roundtripped.patterns.trim()).toBe(original.patterns.trim())
    expect(roundtripped.doNotTouch.trim()).toBe(original.doNotTouch.trim())
  })

  it('fills empty sections with placeholder comments', () => {
    const serialized = serializeCodebase({
      structure: '',
      keyFiles: '',
      conventions: '',
      patterns: '',
      doNotTouch: '',
    })
    expect(serialized).toContain('mexai map')
  })
})

describe('formatCodebaseForInjection', () => {
  it('stays within the token budget', () => {
    const cb = parseCodebase(VALID_CODEBASE_MD)
    const budget = 150
    const result = formatCodebaseForInjection(cb, budget)
    expect(result.length).toBeGreaterThan(0)
    // Rough check — result should be reasonable size
    expect(result.length).toBeLessThanOrEqual(budget * 4 + 100)
  })

  it('always includes key files (highest priority)', () => {
    const cb = parseCodebase(VALID_CODEBASE_MD)
    const result = formatCodebaseForInjection(cb, 300)
    expect(result).toContain('Key Files')
    expect(result).toContain('index.ts')
  })

  it('returns placeholder when codebase is empty', () => {
    const result = formatCodebaseForInjection({
      structure: '',
      keyFiles: '',
      conventions: '',
      patterns: '',
      doNotTouch: '',
    }, 300)
    expect(result).toContain('not yet initialized')
  })
})
