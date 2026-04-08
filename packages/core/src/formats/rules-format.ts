/**
 * Layer 3 format module — rules.md parse / serialize / inject.
 *
 * Rules are never truncated — they must fit within budget or a warning is issued.
 * The full rules.md content is always included as-is.
 */

import type { ParsedRules } from '../types.js'
import { estimateTokens } from '../budget.js'

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/**
 * Parse a raw rules.md string into a typed `ParsedRules`.
 */
export function parseRules(raw: string): ParsedRules {
  const sections = splitSections(raw)
  return {
    codeQuality: sections['Code Quality'] ?? '',
    security: sections.Security ?? '',
    consistency: sections.Consistency ?? '',
    reviewGates: sections['Review Gates'] ?? '',
    raw,
  }
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

/**
 * Serialize a `ParsedRules` back to rules.md markdown.
 * Uses the raw content if available for lossless roundtrip.
 */
export function serializeRules(rules: ParsedRules): string {
  // If raw is populated, preserve it exactly (rules are user-edited)
  if (rules.raw.trim().length > 0) return rules.raw

  const sections = [
    `# Agent Rules`,
    rules.codeQuality.trim().length > 0
      ? `## Code Quality\n\n${rules.codeQuality.trim()}`
      : '',
    rules.security.trim().length > 0
      ? `## Security\n\n${rules.security.trim()}`
      : '',
    rules.consistency.trim().length > 0
      ? `## Consistency\n\n${rules.consistency.trim()}`
      : '',
    rules.reviewGates.trim().length > 0
      ? `## Review Gates\n\n${rules.reviewGates.trim()}`
      : '',
  ].filter(Boolean)

  return sections.join('\n\n') + '\n'
}

// ---------------------------------------------------------------------------
// Format for injection
// ---------------------------------------------------------------------------

/** Injection result that includes a budget warning when rules are over budget. */
export interface RulesInjectionResult {
  content: string
  overBudget: boolean
  tokensUsed: number
}

/**
 * Format rules for injection into an AI session.
 * Rules are NEVER truncated. If over budget, a warning is returned alongside.
 */
export function formatRulesForInjection(rules: ParsedRules, budget: number): RulesInjectionResult {
  const content = rules.raw.trim().length > 0 ? rules.raw.trim() : buildRulesText(rules)
  const tokensUsed = estimateTokens(content)
  return {
    content,
    overBudget: tokensUsed > budget,
    tokensUsed,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRulesText(rules: ParsedRules): string {
  const parts: string[] = ['# Agent Rules']
  if (rules.codeQuality.trim()) parts.push(`## Code Quality\n\n${rules.codeQuality.trim()}`)
  if (rules.security.trim()) parts.push(`## Security\n\n${rules.security.trim()}`)
  if (rules.consistency.trim()) parts.push(`## Consistency\n\n${rules.consistency.trim()}`)
  if (rules.reviewGates.trim()) parts.push(`## Review Gates\n\n${rules.reviewGates.trim()}`)
  return parts.join('\n\n')
}

function splitSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const parts = content.split(/^##\s+/m)

  for (const part of parts) {
    if (part.trim().length === 0) continue
    const newline = part.indexOf('\n')
    if (newline === -1) continue
    const heading = part.slice(0, newline).trim()
    const body = part.slice(newline + 1).trim()
    if (heading.length > 0) {
      sections[heading] = body
    }
  }
  return sections
}
