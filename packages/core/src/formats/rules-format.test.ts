import { describe, it, expect } from 'vitest'
import { parseRules, serializeRules, formatRulesForInjection } from './rules-format.js'

const VALID_RULES_MD = `# Agent Rules

## Code Quality

- Follow existing code style
- Write tests for all new functionality

## Security

- Never log secrets or tokens
- Validate all external input

## Consistency

- Match naming conventions in use
- Use the same error handling patterns

## Review Gates

- All tests pass before suggesting a commit
- No new lint warnings
`

describe('parseRules', () => {
  it('parses all sections', () => {
    const rules = parseRules(VALID_RULES_MD)
    expect(rules.codeQuality).toContain('existing code style')
    expect(rules.security).toContain('Never log secrets')
    expect(rules.consistency).toContain('naming conventions')
    expect(rules.reviewGates).toContain('tests pass')
  })

  it('stores raw content', () => {
    const rules = parseRules(VALID_RULES_MD)
    expect(rules.raw).toBe(VALID_RULES_MD)
  })

  it('handles empty sections gracefully', () => {
    const minimal = `# Agent Rules\n\n## Code Quality\n\nFollow best practices.\n`
    const rules = parseRules(minimal)
    expect(rules.codeQuality).toBe('Follow best practices.')
    expect(rules.security).toBe('')
  })
})

describe('serializeRules', () => {
  it('roundtrip: parse → serialize returns original raw', () => {
    const rules = parseRules(VALID_RULES_MD)
    const serialized = serializeRules(rules)
    // serializeRules returns raw when available
    expect(serialized.trim()).toBe(VALID_RULES_MD.trim())
  })

  it('builds from sections when raw is empty', () => {
    const rules = parseRules(VALID_RULES_MD)
    const noRaw = { ...rules, raw: '' }
    const serialized = serializeRules(noRaw)
    expect(serialized).toContain('Agent Rules')
    expect(serialized).toContain('Code Quality')
  })
})

describe('formatRulesForInjection', () => {
  it('returns full content (rules never truncated)', () => {
    const rules = parseRules(VALID_RULES_MD)
    const result = formatRulesForInjection(rules, 1000)
    expect(result.content).toContain('Agent Rules')
    expect(result.overBudget).toBe(false)
  })

  it('reports overBudget when rules exceed ceiling', () => {
    const rules = parseRules(VALID_RULES_MD)
    const result = formatRulesForInjection(rules, 1) // impossibly small budget
    expect(result.overBudget).toBe(true)
    // Content still returned — rules are never truncated
    expect(result.content.length).toBeGreaterThan(0)
  })

  it('returns tokensUsed count', () => {
    const rules = parseRules(VALID_RULES_MD)
    const result = formatRulesForInjection(rules, 1000)
    expect(result.tokensUsed).toBeGreaterThan(0)
  })
})
