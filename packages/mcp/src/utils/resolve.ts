import { resolveProject } from '@mexai/core'
import type { RegistryEntry } from '@mexai/core'

/**
 * Resolve the project for an MCP tool call.
 * Chain: explicit slug → workspacePath → active fallback → throws StoreError
 */
export function resolveMcpProject(workspacePath?: string, slug?: string): RegistryEntry {
  if (slug !== undefined) return resolveProject({ slug })
  if (workspacePath !== undefined) return resolveProject({ workspacePath })
  return resolveProject({})
}
