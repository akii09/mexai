/**
 * mexai status — show the current state of the active project.
 *
 * States:
 *   clean   — no pending diff, store git is clean, nothing to do
 *   staged  — pending diff exists, needs  mexai commit
 *   dirty   — store has uncommitted git changes (e.g. manual file edit)
 *
 * Use --json for machine-readable output.
 */

import chalk from 'chalk'
import {
  readPendingDiff,
  gitIsDirty,
  projectStorePath,
} from '@mexai/core'
import { warn, success, blank, header, label, dim } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface StatusOptions {
  slug?: string
  project?: string
  json?: boolean
}

export async function runStatus(options: StatusOptions): Promise<void> {
  try {
    const entry = await resolveFromOptions(options)
    const diff = readPendingDiff(entry.slug)
    const storePath = projectStorePath(entry.slug)
    const dirty = await gitIsDirty(storePath).catch(() => false)

    // ── Determine state ──────────────────────────────────────────────────────
    type State = 'staged' | 'dirty' | 'clean'
    let state: State = 'clean'
    if (diff !== undefined) state = 'staged'
    else if (dirty) state = 'dirty'

    // ── JSON output ──────────────────────────────────────────────────────────
    if (options.json === true) {
      const out = {
        slug: entry.slug,
        name: entry.name,
        path: entry.path,
        remote: entry.remote ?? null,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        state,
        hasPendingDiff: diff !== undefined,
        storeDirty: dirty,
        pendingDiff:
          diff !== undefined
            ? {
                sources: diff.sources,
                commitMessage: diff.commitMessage,
                sessionNote: diff.sessionNote ?? null,
                preview: diff.preview,
                createdAt: diff.createdAt,
                updatedAt: diff.updatedAt,
              }
            : null,
        remediation: getRemediation(state, entry.remote),
      }
      console.log(JSON.stringify(out, null, 2))
      return
    }

    // ── Human output ─────────────────────────────────────────────────────────
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

    if (state === 'staged' && diff !== undefined) {
      console.log(chalk.bold.yellow('● STAGED') + chalk.dim(' — pending diff waiting for review'))
      blank()
      console.log(chalk.bold('Pending diff:'))
      console.log(`  ${chalk.dim('Summary:  ')}${diff.preview.summary}`)
      console.log(`  ${chalk.dim('Sources:  ')}${diff.sources.join(', ')}`)
      console.log(`  ${chalk.dim('Message:  ')}${diff.commitMessage}`)
      console.log(`  ${chalk.dim('Updated:  ')}${diff.updatedAt.slice(0, 19).replace('T', ' ')} UTC`)
      blank()
      console.log(`  ${chalk.cyan('→')} Run  ${chalk.bold('mexai diff')}               to review changes`)
      console.log(`  ${chalk.cyan('→')} Run  ${chalk.bold('mexai commit')}             to apply and commit`)
      console.log(`  ${chalk.cyan('→')} Run  ${chalk.bold('mexai diff --discard')}     to discard`)
    } else if (state === 'dirty') {
      console.log(chalk.bold.yellow('● DIRTY') + chalk.dim(' — store has uncommitted changes'))
      blank()
      warn('The store git tree has untracked changes (manual layer file edit?).')
      blank()
      console.log(`  ${chalk.cyan('→')} Run  ${chalk.bold('mexai validate')}  to check file integrity`)
      console.log(`  ${chalk.cyan('→')} Run  ${chalk.bold('mexai doctor')}     to auto-repair malformed files`)
    } else {
      console.log(chalk.bold.green('● CLEAN') + chalk.dim(' — context is up to date'))
      blank()
      success('Nothing to commit.')
    }

    if (entry.remote === undefined) {
      blank()
      dim('No remote configured — run  mexai sync --init  to connect GitHub.')
    }
  } catch (err) {
    handleError(err)
  }
}

function getRemediation(
  state: 'staged' | 'dirty' | 'clean',
  remote: string | undefined
): string {
  if (state === 'staged') return 'Run `mexai diff` to review, then `mexai commit` to apply.'
  if (state === 'dirty') return 'Run `mexai validate` or `mexai doctor` to inspect the store.'
  if (remote === undefined) return 'Run `mexai sync --init` to connect a remote.'
  return 'Nothing to do.'
}
