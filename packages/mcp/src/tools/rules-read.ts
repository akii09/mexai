import { readLayer, parseRules, StoreError } from '@mexai/core'
import type { McpToolResult } from '@mexai/core'
import { resolveMcpProject } from '../utils/resolve.js'

export interface RulesReadInput {
  workspacePath?: string | undefined
  slug?: string | undefined
}

export function handleRulesRead(input: RulesReadInput): McpToolResult {
  try {
    const entry = resolveMcpProject(input.workspacePath, input.slug)
    const raw = readLayer(entry.slug, 'rules')
    const parsed = parseRules(raw)
    return {
      success: true,
      data: { projectSlug: entry.slug, content: parsed.raw },
    }
  } catch (err) {
    if (err instanceof StoreError) return { success: false, error: err.code, message: err.message }
    return { success: false, error: 'STORE_ERROR', message: err instanceof Error ? err.message : String(err) }
  }
}
