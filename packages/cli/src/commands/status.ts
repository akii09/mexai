/**
 * mexai status — show the current state of the active project.
 *
 * Displays project metadata, pending diff summary, and remote sync info.
 */

import chalk from 'chalk'
import {
  readPendingDiff,
  gitIsDirty,
  projectStorePath,
} from '@mexai/core'
import { info, warn, blank, header, label, dim, badge } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface StatusOptions {
  slug?: string
  project?: string
}

export async function runStatus(options: StatusOptions): Promise<void> {
  try {
    const entry = resolveFromOptions(options)
    const diff = readPendingDiff(entry.slug)
    const storePath = projectStorePath(entry.slug)
    const dirty = await gitIsDirty(storePath).catch(() => false)

    header(`Status — ${entry.name}`)
    blank()

    label('Slug', entry.slug)
    label('Path', entry.path)
    label('Created', entry.createdAt.slice(0, 10))
    label('Updated', entry.updatedAt.slice(0, 10))
    if (entry.remote !== undefined) {
      label('Remote', entry.remote)
    }

    blank()
    console.log(chalk.bold('Store:'))
    if (dirty) {
      console.log(`  ${badge('uncommitted changes', 'yellow')}`)
    } else {
      console.log(`  ${badge('clean', 'green')}`)
    }

    blank()
    console.log(chalk.bold('Pending diff:'))
    if (diff === undefined) {
      console.log(`  ${chalk.dim('none — context is up to date')}`)
    } else {
      console.log(`  ${badge('pending', 'yellow')} ${diff.preview.summary}`)
      console.log(`  ${chalk.dim('Sources: ' + diff.sources.join(', '))}`)
      console.log(`  ${chalk.dim('Updated: ' + diff.updatedAt.slice(0, 19).replace('T', ' ') + ' UTC')}`)
      blank()
      info('Run  mexai diff    to review changes.')
      warn('Run  mexai commit  to apply and commit.')
    }

    if (entry.remote === undefined) {
      blank()
      dim('No remote configured. Run  mexai sync --init  to connect GitHub.')
    }
  } catch (err) {
    handleError(err)
  }
}
