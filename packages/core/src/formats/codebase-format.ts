/**
 * Layer 2 format module — codebase.md parse / serialize / inject.
 *
 * File structure:
 * # Codebase Map
 *
 * ## Structure
 * <directory tree>
 *
 * ## Key Files
 * <key files>
 *
 * ## Conventions
 * <conventions>
 *
 * ## Patterns
 * <patterns>
 *
 * ## Do Not Touch
 * <do not touch>
 */

import type { ParsedCodebase } from '../types.js'
import { estimateTokens, trimToBudget } from '../budget.js'
import type { BudgetSection } from '../budget.js'

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/**
 * Parse a raw codebase.md string into a typed `ParsedCodebase`.
 */
export function parseCodebase(raw: string): ParsedCodebase {
  const sections = splitSections(raw)
  return {
    structure: sections.Structure ?? '',
    keyFiles: sections['Key Files'] ?? '',
    conventions: sections.Conventions ?? '',
    patterns: sections.Patterns ?? '',
    doNotTouch: sections['Do Not Touch'] ?? '',
  }
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

/**
 * Serialize a `ParsedCodebase` back to codebase.md markdown.
 */
export function serializeCodebase(cb: ParsedCodebase): string {
  const sections = [
    `# Codebase Map`,
    `## Structure\n\n${cb.structure.trim() || '<!-- Run `mexai map` to generate this. -->'}`,
    `## Key Files\n\n${cb.keyFiles.trim() || '<!-- No key files documented yet. -->'}`,
    `## Conventions\n\n${cb.conventions.trim() || '<!-- No conventions documented yet. -->'}`,
    `## Patterns\n\n${cb.patterns.trim() || '<!-- No patterns documented yet. -->'}`,
    `## Do Not Touch\n\n${cb.doNotTouch.trim() || '<!-- No restricted files yet. -->'}`,
  ]
  return sections.join('\n\n') + '\n'
}

// ---------------------------------------------------------------------------
// Format for injection
// ---------------------------------------------------------------------------

/**
 * Format a `ParsedCodebase` for token-efficient injection into an AI session.
 *
 * Truncation priority (highest → lowest):
 * 1. Key Files (never truncated)
 * 2. Conventions (never truncated)
 * 3. Structure tree — deepest levels removed first (trimmed as whole section)
 * 4. Patterns — oldest removed first (trimmed as whole section)
 */
export function formatCodebaseForInjection(cb: ParsedCodebase, budget: number): string {
  const sections: BudgetSection[] = []

  if (cb.keyFiles.trim().length > 0) {
    sections.push({
      content: `## Key Files\n\n${cb.keyFiles.trim()}`,
      priority: 90,
    })
  }

  if (cb.conventions.trim().length > 0) {
    sections.push({
      content: `## Conventions\n\n${cb.conventions.trim()}`,
      priority: 80,
    })
  }

  if (cb.structure.trim().length > 0) {
    sections.push({
      content: `## Structure\n\n${trimStructureTree(cb.structure, Math.floor(budget / 3))}`,
      priority: 50,
    })
  }

  if (cb.patterns.trim().length > 0) {
    sections.push({
      content: `## Patterns\n\n${cb.patterns.trim()}`,
      priority: 30,
    })
  }

  if (sections.length === 0) {
    return '# Codebase Map\n\n_(not yet initialized — run `mexai map`)_'
  }

  const header = '# Codebase Map'
  const headerTokens = estimateTokens(header)
  const body = trimToBudget(sections, Math.max(budget - headerTokens, 10))
  return `${header}\n\n${body}`
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Trim the structure tree to fit within a token budget by removing
 * deeply-nested lines first.
 */
function trimStructureTree(tree: string, budget: number): string {
  if (estimateTokens(tree) <= budget) return tree

  const lines = tree.split('\n')
  // Count indentation depth — more indented = deeper = trimmed first
  const withDepth = lines.map((line) => ({
    line,
    depth: (line.match(/^\s*/)?.[0].length ?? 0),
  }))

  // Sort by depth descending — trim deepest first
  let result = [...withDepth]
  const maxChars = budget * 4

  while (result.join('\n').length > maxChars && result.length > 1) {
    const maxDepth = Math.max(...result.map((r) => r.depth))
    // Remove all lines at max depth
    result = result.filter((r) => r.depth < maxDepth)
  }

  return result.map((r) => r.line).join('\n')
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
