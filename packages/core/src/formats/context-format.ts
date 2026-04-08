/**
 * Layer 1 format module — context.md parse / serialize / inject.
 *
 * File structure:
 * ---
 * YAML frontmatter
 * ---
 *
 * ## Identity
 * <identity text>
 *
 * ## Current State
 * <current state text>
 *
 * ## Decisions
 * ### YYYY-MM-DD: Title
 * Rationale text
 *
 * ## Open Threads
 * - [ ] pending thread content
 * - [x] resolved thread content
 */

import matter from 'gray-matter'
import type { ParsedContext, ContextFrontmatter, DecisionEntry, ThreadEntry } from '../types.js'
import { ContextFrontmatterSchema } from '../schemas.js'
import { StoreError } from '../types.js'
import { estimateTokens, trimToBudget } from '../budget.js'
import type { BudgetSection } from '../budget.js'

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/**
 * Parse a raw context.md string into a typed `ParsedContext`.
 * Throws `StoreError` if frontmatter is missing or invalid.
 */
export function parseContext(raw: string): ParsedContext {
  const { data, content } = matter(raw)

  const frontmatterResult = ContextFrontmatterSchema.safeParse(data)
  if (!frontmatterResult.success) {
    throw new StoreError(
      'STORE_ERROR',
      `context.md has invalid frontmatter: ${frontmatterResult.error.message}`
    )
  }

  const frontmatter = frontmatterResult.data as ContextFrontmatter
  const sections = splitSections(content)

  return {
    frontmatter,
    identity: sections['Identity'] ?? '',
    currentState: sections['Current State'] ?? '',
    decisions: parseDecisions(sections['Decisions'] ?? ''),
    openThreads: parseThreads(sections['Open Threads'] ?? ''),
  }
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

/**
 * Serialize a `ParsedContext` back into context.md markdown.
 * Roundtrip: parseContext(serializeContext(ctx)) ≈ ctx
 */
export function serializeContext(ctx: ParsedContext): string {
  const frontmatterData: Record<string, unknown> = {
    name: ctx.frontmatter.name,
    slug: ctx.frontmatter.slug,
    domain: ctx.frontmatter.domain,
    stack: ctx.frontmatter.stack,
    status: ctx.frontmatter.status,
    createdAt: ctx.frontmatter.createdAt,
    updatedAt: ctx.frontmatter.updatedAt,
  }

  const body = [
    `## Identity\n\n${ctx.identity.trim()}`,
    `## Current State\n\n${ctx.currentState.trim()}`,
    `## Decisions\n\n${serializeDecisions(ctx.decisions)}`,
    `## Open Threads\n\n${serializeThreads(ctx.openThreads)}`,
  ].join('\n\n')

  return matter.stringify(body, frontmatterData)
}

// ---------------------------------------------------------------------------
// Format for injection
// ---------------------------------------------------------------------------

/**
 * Format a `ParsedContext` for token-efficient injection into an AI session.
 *
 * Truncation priority (highest → lowest):
 * 1. Identity (never truncated)
 * 2. Current State (never truncated)
 * 3. Open Threads — resolved removed first, then oldest unresolved
 * 4. Decisions — oldest removed first
 */
export function formatContextForInjection(ctx: ParsedContext, budget: number): string {
  const header = `# Project: ${ctx.frontmatter.name}\n**Domain:** ${ctx.frontmatter.domain} | **Stack:** ${ctx.frontmatter.stack.join(', ')}`
  const identity = `## Identity\n\n${ctx.identity.trim()}`
  const currentState = `## Current State\n\n${ctx.currentState.trim()}`

  // Decisions — trim oldest first (lowest index = oldest)
  const decisionsText = formatDecisionsForInjection(ctx.decisions)
  const threadsText = formatThreadsForInjection(ctx.openThreads)

  const sections: BudgetSection[] = [
    { content: header, priority: 100 },
    { content: identity, priority: 90 },
    { content: currentState, priority: 80 },
    { content: `## Open Threads\n\n${threadsText}`, priority: 60 },
    { content: `## Decisions\n\n${decisionsText}`, priority: 40 },
  ].filter((s) => s.content.trim().split('\n').slice(1).join('').trim().length > 0)

  const headerTokens = estimateTokens(header)
  return trimToBudget(sections, Math.max(budget, headerTokens + 10))
}

// ---------------------------------------------------------------------------
// Decision helpers
// ---------------------------------------------------------------------------

function parseDecisions(raw: string): DecisionEntry[] {
  if (raw.trim().length === 0) return []

  const entries: DecisionEntry[] = []
  // Match "### YYYY-MM-DD: Title\nRationale"
  const pattern = /###\s+(\d{4}-\d{2}-\d{2}):\s+(.+?)(?=\n###|\s*$)/gs

  let match: RegExpExecArray | null
  while ((match = pattern.exec(raw)) !== null) {
    const date = match[1] ?? ''
    const titleAndBody = match[2] ?? ''
    const newlineIdx = titleAndBody.indexOf('\n')
    const title = newlineIdx === -1 ? titleAndBody.trim() : titleAndBody.slice(0, newlineIdx).trim()
    const rationale = newlineIdx === -1 ? '' : titleAndBody.slice(newlineIdx + 1).trim()
    entries.push({ date, title, rationale })
  }
  return entries
}

function serializeDecisions(decisions: DecisionEntry[]): string {
  if (decisions.length === 0) {
    return '<!-- No decisions recorded yet. -->'
  }
  return decisions
    .map((d) => `### ${d.date}: ${d.title}\n\n${d.rationale}`)
    .join('\n\n')
}

function formatDecisionsForInjection(decisions: DecisionEntry[]): string {
  if (decisions.length === 0) return '_(none)_'
  // Most recent decisions are more relevant — show last N that fit
  const recent = [...decisions].reverse().slice(0, 5)
  return recent.map((d) => `**${d.date} — ${d.title}:** ${d.rationale}`).join('\n')
}

// ---------------------------------------------------------------------------
// Thread helpers
// ---------------------------------------------------------------------------

function parseThreads(raw: string): ThreadEntry[] {
  if (raw.trim().length === 0) return []

  const entries: ThreadEntry[] = []
  const lines = raw.split('\n')
  // addedAt is stored as an HTML comment on the same line: <!-- 2026-04-09 -->
  const datePattern = /<!--\s*(\d{4}-\d{2}-\d{2}[T\d:.Z+-]*)\s*-->/

  for (const line of lines) {
    const unchecked = /^-\s+\[\s*\]\s+(.+)/.exec(line)
    const checked = /^-\s+\[x\]\s+(.+)/i.exec(line)

    if (unchecked ?? checked) {
      const match = unchecked ?? checked
      if (match === null || match === undefined) continue
      const full = match[1] ?? ''
      const dateMatch = datePattern.exec(full)
      const content = full.replace(datePattern, '').trim()
      const addedAt = dateMatch?.[1] ?? new Date().toISOString().slice(0, 10)
      entries.push({ content, resolved: checked !== null, addedAt })
    }
  }
  return entries
}

function serializeThreads(threads: ThreadEntry[]): string {
  if (threads.length === 0) {
    return '<!-- No open threads. -->'
  }
  return threads
    .map((t) => {
      const checkbox = t.resolved ? '[x]' : '[ ]'
      return `- ${checkbox} ${t.content} <!-- ${t.addedAt} -->`
    })
    .join('\n')
}

function formatThreadsForInjection(threads: ThreadEntry[]): string {
  const open = threads.filter((t) => !t.resolved)
  if (open.length === 0) return '_(none)_'
  return open.map((t) => `- [ ] ${t.content}`).join('\n')
}

// ---------------------------------------------------------------------------
// Section splitter
// ---------------------------------------------------------------------------

function splitSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const headingPattern = /^##\s+(.+)$/m
  const parts = content.split(/^##\s+/m)

  for (const part of parts) {
    if (part.trim().length === 0) continue
    const newline = part.indexOf('\n')
    if (newline === -1) continue
    const heading = part.slice(0, newline).trim()
    const body = part.slice(newline + 1).trim()
    // Guard against empty heading
    if (!headingPattern.test(`## ${heading}`) && heading.length === 0) continue
    sections[heading] = body
  }
  return sections
}
