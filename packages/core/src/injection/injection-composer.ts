/**
 * InjectionComposer — assembles the final injection payload from all three layers.
 *
 * Layer order: rules → context → codebase
 * (rules first so agents see constraints before content)
 */

import type { InjectionPayload, Layer, LayerBreakdown } from '../types.js'
import { StoreError } from '../types.js'
import { readLayer } from '../store/store-manager.js'
import { getTokenBudget } from '../store/config-manager.js'
import { parseContext, formatContextForInjection } from '../formats/context-format.js'
import { parseCodebase, formatCodebaseForInjection } from '../formats/codebase-format.js'
import { parseRules, formatRulesForInjection } from '../formats/rules-format.js'
import { estimateTokens } from '../budget.js'

export interface ComposeOptions {
  /** Which layers to include. Defaults to all three. */
  layers?: Layer[] | undefined
  /** Override the total token ceiling from config. */
  maxTokens?: number | undefined
}

/**
 * Compose the injection payload for a given project slug.
 * Reads each requested layer from the store, formats within budget, and assembles.
 *
 * Layer order in output: rules → context → codebase
 */
export async function compose(slug: string, opts: ComposeOptions = {}): Promise<InjectionPayload> {
  const budget = getTokenBudget()
  const totalCeiling = opts.maxTokens ?? budget.total
  const requestedLayers: Layer[] = opts.layers ?? ['rules', 'context', 'codebase']

  const breakdown: LayerBreakdown = { context: 0, codebase: 0, rules: 0 }
  const parts: string[] = []

  // Rules — injected first
  if (requestedLayers.includes('rules')) {
    const raw = safeReadLayer(slug, 'rules')
    if (raw !== null) {
      const parsed = parseRules(raw)
      const result = formatRulesForInjection(parsed, budget.rules)
      breakdown.rules = result.tokensUsed
      parts.push(result.content)
    }
  }

  // Context — injected second
  if (requestedLayers.includes('context')) {
    const raw = safeReadLayer(slug, 'context')
    if (raw !== null) {
      const parsed = parseContext(raw)
      const contextBudget = Math.min(budget.context, totalCeiling - sumBreakdown(breakdown))
      const formatted = formatContextForInjection(parsed, Math.max(contextBudget, 50))
      breakdown.context = estimateTokens(formatted)
      parts.push(formatted)
    }
  }

  // Codebase — injected last
  if (requestedLayers.includes('codebase')) {
    const raw = safeReadLayer(slug, 'codebase')
    if (raw !== null) {
      const parsed = parseCodebase(raw)
      const codebaseBudget = Math.min(budget.codebase, totalCeiling - sumBreakdown(breakdown))
      const formatted = formatCodebaseForInjection(parsed, Math.max(codebaseBudget, 50))
      breakdown.codebase = estimateTokens(formatted)
      parts.push(formatted)
    }
  }

  const text = parts.join('\n\n---\n\n')
  const tokensUsed = estimateTokens(text)

  return { text, tokensUsed, layerBreakdown: breakdown }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a layer without throwing — returns null if not initialized. */
function safeReadLayer(slug: string, layer: Layer): string | null {
  try {
    return readLayer(slug, layer)
  } catch (err) {
    if (err instanceof StoreError && err.code === 'LAYER_NOT_INITIALIZED') {
      return null
    }
    throw err
  }
}

function sumBreakdown(breakdown: LayerBreakdown): number {
  return breakdown.context + breakdown.codebase + breakdown.rules
}
