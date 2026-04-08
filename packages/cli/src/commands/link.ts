/**
 * mexai link — register a codebase path for an existing project.
 *
 * Usage:
 *   mexai link <slug>           — links cwd to the given slug
 *   mexai link <slug> <path>    — links the given path to the slug
 */

import * as path from 'node:path'
import { linkPath, resolveProject, writeProjectLink } from '@mexai/core'
import { success, info, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'

interface LinkOptions {
  path?: string
}

export function runLink(slug: string, options: LinkOptions): void {
  try {
    const targetPath = options.path !== undefined
      ? path.resolve(options.path)
      : process.cwd()

    header('mexai link')
    blank()

    linkPath(slug, targetPath)
    writeProjectLink(targetPath, slug)

    const entry = resolveProject({ slug })

    success(`Linked "${entry.name}" to ${targetPath}`)
    info('mexai.json written — project will auto-detect in this directory.')
    blank()
    label('Slug', slug)
    label('Path', targetPath)
  } catch (err) {
    handleError(err)
  }
}
