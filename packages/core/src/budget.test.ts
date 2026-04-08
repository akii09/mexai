import { describe, it, expect } from 'vitest'
import { estimateTokens, isWithinBudget, trimToBudget, hardTruncate } from './budget.js'
import type { BudgetSection } from './budget.js'

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('rounds up partial tokens', () => {
    // 1 char → ceil(1/4) = 1
    expect(estimateTokens('a')).toBe(1)
    // 4 chars → ceil(4/4) = 1
    expect(estimateTokens('abcd')).toBe(1)
    // 5 chars → ceil(5/4) = 2
    expect(estimateTokens('abcde')).toBe(2)
  })

  it('estimates tokens for typical text', () => {
    // 400 chars → ceil(400/4) = 100 tokens
    const text = 'a'.repeat(400)
    expect(estimateTokens(text)).toBe(100)
  })

  it('handles unicode characters', () => {
    // emoji is multiple bytes but we count string length (code units)
    const emoji = '🚀' // length 2 in JS
    expect(estimateTokens(emoji)).toBe(1) // ceil(2/4)
  })
})

describe('isWithinBudget', () => {
  it('returns true when text fits exactly', () => {
    const text = 'a'.repeat(400) // 100 tokens
    expect(isWithinBudget(text, 100)).toBe(true)
  })

  it('returns true when text fits with room to spare', () => {
    expect(isWithinBudget('hello', 250)).toBe(true)
  })

  it('returns false when text exceeds ceiling', () => {
    const text = 'a'.repeat(401) // 101 tokens
    expect(isWithinBudget(text, 100)).toBe(false)
  })

  it('returns true for empty string with any ceiling', () => {
    expect(isWithinBudget('', 1)).toBe(true)
  })
})

describe('trimToBudget', () => {
  it('returns empty string for empty sections array', () => {
    expect(trimToBudget([], 100)).toBe('')
  })

  it('returns all sections when they fit within budget', () => {
    const sections: BudgetSection[] = [
      { content: 'Section A', priority: 3 },
      { content: 'Section B', priority: 2 },
      { content: 'Section C', priority: 1 },
    ]
    const result = trimToBudget(sections, 1000)
    expect(result).toContain('Section A')
    expect(result).toContain('Section B')
    expect(result).toContain('Section C')
  })

  it('removes lowest priority section first when over budget', () => {
    // Each section is ~25 tokens (100 chars), ceiling is 52 tokens
    // Two sections + separator fits, three does not
    const content100 = 'x'.repeat(100)
    const sections: BudgetSection[] = [
      { content: content100, priority: 3, label: 'high' },
      { content: content100, priority: 2, label: 'mid' },
      { content: content100, priority: 1, label: 'low' },
    ]
    const result = trimToBudget(sections, 52)
    expect(result).toContain(content100) // high priority survives
    // low priority dropped
    expect(estimateTokens(result)).toBeLessThanOrEqual(52)
  })

  it('preserves original section order in output', () => {
    const sections: BudgetSection[] = [
      { content: 'First', priority: 1 },
      { content: 'Second', priority: 3 },
      { content: 'Third', priority: 2 },
    ]
    const result = trimToBudget(sections, 1000)
    const firstIdx = result.indexOf('First')
    const secondIdx = result.indexOf('Second')
    const thirdIdx = result.indexOf('Third')
    expect(firstIdx).toBeLessThan(secondIdx)
    expect(secondIdx).toBeLessThan(thirdIdx)
  })

  it('never exceeds the ceiling', () => {
    const sections: BudgetSection[] = Array.from({ length: 10 }, (_, i) => ({
      content: 'x'.repeat(200),
      priority: i,
    }))
    const ceiling = 100
    const result = trimToBudget(sections, ceiling)
    expect(estimateTokens(result)).toBeLessThanOrEqual(ceiling)
  })

  it('hard-truncates when even the top section exceeds ceiling', () => {
    const sections: BudgetSection[] = [
      { content: 'x'.repeat(1000), priority: 1 },
    ]
    const result = trimToBudget(sections, 10) // 10 tokens = 40 chars
    expect(estimateTokens(result)).toBeLessThanOrEqual(10 + 1) // +1 for ellipsis
  })
})

describe('hardTruncate', () => {
  it('returns text unchanged when within ceiling', () => {
    expect(hardTruncate('hello world', 100)).toBe('hello world')
  })

  it('truncates long text and appends ellipsis', () => {
    const text = 'word '.repeat(200) // 1000 chars
    const result = hardTruncate(text, 50) // 200 chars max
    expect(result.length).toBeLessThanOrEqual(204) // 200 + ' …'
    expect(result).toMatch(/ …$/)
  })
})
