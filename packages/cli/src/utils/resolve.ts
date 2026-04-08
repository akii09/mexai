/**
 * Project resolution helpers.
 *
 * Wraps `resolveProject` with `exactOptionalPropertyTypes`-compatible
 * argument construction so callers don't need to repeat the spread pattern.
 */

import type { RegistryEntry } from '@mexai/core'
import { resolveProject } from '@mexai/core'

/**
 * Resolve the active project from CLI options.
 * Uses slug (from --project / --slug) then falls back to cwd matching.
 */
export function resolveFromOptions(opts: {
  slug?: string | undefined
  project?: string | undefined
}): RegistryEntry {
  const slug = opts.slug ?? opts.project
  return resolveProject({
    ...(slug !== undefined ? { slug } : {}),
    workspacePath: process.cwd(),
  })
}
