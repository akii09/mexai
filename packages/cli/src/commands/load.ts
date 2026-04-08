/**
 * mexai load — set the active project by slug.
 *
 * Usage:
 *   mexai load <slug>
 *
 * After running, all subsequent mexai commands default to this project.
 */

import { setActive, resolveProject } from '@mexai/core'
import { success, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'

export function runLoad(slug: string): void {
  try {
    // Verify the project exists before setting active
    const entry = resolveProject({ slug })

    setActive(slug)

    header('mexai load')
    blank()
    success(`Active project set to: ${entry.name}`)
    blank()
    label('Slug', entry.slug)
    label('Path', entry.path)
  } catch (err) {
    handleError(err)
  }
}
