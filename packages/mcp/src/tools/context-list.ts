import { listProjects, getActive, StoreError } from '@mexai/core'
import type { McpToolResult } from '@mexai/core'

export function handleContextList(): McpToolResult {
  try {
    const projects = listProjects()
    const activeSlug = getActive()
    return {
      success: true,
      data: {
        projects: projects.map((p) => ({ ...p, isActive: p.slug === activeSlug })),
        total: projects.length,
        active: activeSlug ?? null,
      },
    }
  } catch (err) {
    if (err instanceof StoreError) return { success: false, error: err.code, message: err.message }
    return { success: false, error: 'STORE_ERROR', message: err instanceof Error ? err.message : String(err) }
  }
}
