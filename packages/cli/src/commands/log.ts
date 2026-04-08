/**
 * mexai log — display the git history for the active project store.
 */

import chalk from 'chalk'
import { gitLog, projectStorePath } from '@mexai/core'
import { blank, header, label, dim } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface LogOptions {
  slug?: string
  project?: string
  n?: string
}

export async function runLog(options: LogOptions): Promise<void> {
  try {
    const entry = resolveFromOptions(options)

    const count = options.n !== undefined ? parseInt(options.n, 10) : 10
    const storePath = projectStorePath(entry.slug)
    const entries = await gitLog(storePath, isNaN(count) ? 10 : count)

    header(`Log — ${entry.name}`)
    blank()

    if (entries.length === 0) {
      dim('No commits yet.')
      return
    }

    for (const e of entries) {
      console.log(
        `${chalk.yellow(e.hash.slice(0, 8))}  ${chalk.dim(formatDate(e.date))}  ${e.message}`
      )
    }

    blank()
    label('Project store', storePath)
    blank()
    dim('Run  mexai restore <hash>  to restore to a specific commit.')
  } catch (err) {
    handleError(err)
  }
}

function formatDate(iso: string): string {
  return iso.slice(0, 10)
}
