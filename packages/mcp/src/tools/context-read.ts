/**
 * context_read — read project context, codebase, and rules.
 */
import { compose, StoreError } from '@mexai/core'
import type { McpToolResult, Layer } from '@mexai/core'
import { resolveMcpProject } from '../utils/resolve.js'

export interface ContextReadInput {
  workspacePath?: string | undefined
  slug?: string | undefined
  layers?: Layer[] | undefined
  maxTokens?: number | undefined
}

export function handleContextRead(input: ContextReadInput): McpToolResult {
  try {
    const entry = resolveMcpProject(input.workspacePath, input.slug)
    const payload = compose(entry.slug, { layers: input.layers, maxTokens: input.maxTokens })
    return {
      success: true,
      data: {
        projectSlug: entry.slug,
        projectName: entry.name,
        content: payload.text,
        tokensUsed: payload.tokensUsed,
        layerBreakdown: payload.layerBreakdown,
      },
    }
  } catch (err) {
    if (err instanceof StoreError) return { success: false, error: err.code, message: err.message }
    return { success: false, error: 'STORE_ERROR', message: err instanceof Error ? err.message : String(err) }
  }
}
