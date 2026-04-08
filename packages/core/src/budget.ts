/**
 * Token budget calculator.
 * Estimates token usage and trims content sections to fit within a ceiling.
 *
 * Token estimation: Math.ceil(text.length / 4)
 * This approximates the GPT tokenizer at ~4 chars/token, matching the
 * architecture doc's specified budget ceiling behaviour.
 */

/** A content section with an assigned trim priority. Lower = trimmed first. */
export interface BudgetSection {
  /** Raw text content of the section. */
  content: string
  /** Trim priority — lower values are removed first when over budget. */
  priority: number
  /** Optional label shown in injection headers. */
  label?: string | undefined
}

/**
 * Estimate the token count of a string.
 * Uses the 4-chars-per-token approximation.
 */
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0
  return Math.ceil(text.length / 4)
}

/**
 * Return true if text fits within the given token ceiling.
 */
export function isWithinBudget(text: string, ceiling: number): boolean {
  return estimateTokens(text) <= ceiling
}

/**
 * Trim an ordered list of sections to fit within a token ceiling.
 *
 * Sections with the lowest priority are removed first. Within the same
 * priority tier, sections are removed from the end of the array first.
 * Returns the concatenated content of surviving sections separated by
 * double newlines.
 *
 * If no combination fits, returns the single highest-priority section
 * truncated to the ceiling (character-truncated at a word boundary).
 */
export function trimToBudget(sections: BudgetSection[], ceiling: number): string {
  if (sections.length === 0) return ''

  // Sort a copy: highest priority first (will keep these last when trimming)
  const sorted = [...sections].sort((a, b) => b.priority - a.priority)

  // Greedily include sections from highest to lowest priority
  const included: BudgetSection[] = []
  let usedTokens = 0

  for (const section of sorted) {
    const sectionTokens = estimateTokens(section.content)
    const separatorTokens = included.length > 0 ? estimateTokens('\n\n') : 0
    if (usedTokens + sectionTokens + separatorTokens <= ceiling) {
      included.push(section)
      usedTokens += sectionTokens + separatorTokens
    }
    // If it doesn't fit, skip it — it's lower priority
  }

  if (included.length === 0) {
    // Nothing fits — hard-truncate the single highest-priority section
    const top = sorted[0]
    if (top === undefined) return ''
    return hardTruncate(top.content, ceiling)
  }

  // Restore original order among included sections
  const originalOrder = sections.filter((s) => included.includes(s))
  return originalOrder.map((s) => s.content).join('\n\n')
}

/**
 * Hard-truncate text to fit within a token ceiling.
 * Attempts to break at the last word boundary before the limit.
 */
export function hardTruncate(text: string, ceiling: number): string {
  const maxChars = ceiling * 4
  if (text.length <= maxChars) return text

  const truncated = text.slice(0, maxChars)
  const lastSpace = truncated.lastIndexOf(' ')
  return lastSpace > maxChars * 0.5
    ? truncated.slice(0, lastSpace) + ' …'
    : truncated + ' …'
}
