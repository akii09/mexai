/**
 * mexai diff — show the pending diff for the active project.
 *
 * Reads pending-diff.json and displays a human-readable summary.
 * With --discard, clears the pending diff without applying.
 */

import chalk from 'chalk'
import {
  readPendingDiff,
  clearPendingDiff,
} from '@mexai/core'
import { info, warn, success, blank, header, label, dim } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface DiffOptions {
  slug?: string
  project?: string
  discard?: boolean
}

export function runDiff(options: DiffOptions): void {
  try {
    const entry = resolveFromOptions(options)
    const diff = readPendingDiff(entry.slug)

    if (options.discard === true) {
      clearPendingDiff(entry.slug)
      success('Pending diff discarded.')
      return
    }

    header(`Pending diff — ${entry.name}`)
    blank()

    if (diff === undefined) {
      info('No pending diff. The project is up to date.')
      blank()
      dim('AI agents write to pending-diff.json when they propose changes.')
      dim('Run  mexai commit  to apply and commit a pending diff.')
      return
    }

    label('Sources', diff.sources.join(', '))
    label('Commit message', diff.commitMessage)
    if (diff.sessionNote !== undefined) {
      label('Session note', diff.sessionNote)
    }
    label('Created', diff.createdAt.slice(0, 19).replace('T', ' ') + ' UTC')
    label('Updated', diff.updatedAt.slice(0, 19).replace('T', ' ') + ' UTC')

    blank()
    console.log(chalk.bold('Changes:'))

    const { preview } = diff

    if (preview.decisionsAdded > 0) {
      console.log(`  ${chalk.green('+')} ${preview.decisionsAdded} decision${preview.decisionsAdded !== 1 ? 's' : ''} to add`)
    }
    if (preview.threadsAdded > 0) {
      console.log(`  ${chalk.green('+')} ${preview.threadsAdded} open thread${preview.threadsAdded !== 1 ? 's' : ''} to add`)
    }
    if (preview.threadsResolved > 0) {
      console.log(`  ${chalk.cyan('✓')} ${preview.threadsResolved} thread${preview.threadsResolved !== 1 ? 's' : ''} to resolve`)
    }
    if (preview.currentStateChanged) {
      console.log(`  ${chalk.yellow('~')} Current state updated`)
    }

    blank()
    if (diff.changes.decisions !== undefined && diff.changes.decisions.length > 0) {
      console.log(chalk.bold('Decisions:'))
      for (const d of diff.changes.decisions) {
        console.log(`  ${chalk.green('+')} ${chalk.bold(d.title)}`)
        if (d.rationale.length > 0) {
          console.log(`    ${chalk.dim(d.rationale.slice(0, 120))}`)
        }
      }
      blank()
    }

    if (diff.changes.openThreads !== undefined && diff.changes.openThreads.length > 0) {
      console.log(chalk.bold('Threads:'))
      for (const t of diff.changes.openThreads) {
        const icon = t.action === 'add' ? chalk.green('+') : chalk.cyan('✓')
        console.log(`  ${icon} ${t.content}`)
      }
      blank()
    }

    if (diff.changes.currentState !== undefined) {
      console.log(chalk.bold('Current State:'))
      console.log(`  ${chalk.dim(diff.changes.currentState.slice(0, 200))}`)
      blank()
    }

    info('Run  mexai commit  to apply this diff.')
    warn('Run  mexai diff --discard  to discard it without applying.')
  } catch (err) {
    handleError(err)
  }
}
