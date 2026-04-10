/**
 * mexai commit — apply the pending diff and commit to the store.
 *
 * Reads pending-diff.json, applies it to context.md via DiffEngine,
 * writes the updated layer, commits to git, then clears the diff.
 *
 * Use --json for machine-readable output (CI-safe).
 */

import ora from 'ora'
import {
  readPendingDiff,
  readLayer,
  writeLayer,
  clearPendingDiff,
  gitCommit,
  projectStorePath,
  parseContext,
  DiffEngine,
} from '@mexai/core'
import { success, info, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface CommitOptions {
  slug?: string
  project?: string
  json?: boolean
}

export async function runCommit(options: CommitOptions): Promise<void> {
  try {
    const entry = await resolveFromOptions(options)
    const diff = readPendingDiff(entry.slug)

    if (diff === undefined) {
      if (options.json === true) {
        console.log(JSON.stringify({ slug: entry.slug, name: entry.name, committed: false, reason: 'No pending diff.' }))
        return
      }
      header(`mexai commit — ${entry.name}`)
      blank()
      info('No pending diff. Nothing to commit.')
      blank()
      info('AI agents write to pending-diff.json when they propose changes.')
      return
    }

    if (options.json !== true) {
      header(`mexai commit — ${entry.name}`)
      blank()
    }

    const spinner = options.json !== true ? ora('Applying diff…').start() : null

    // Apply the diff to context.md
    const contextRaw = readLayer(entry.slug, 'context')
    const parsedContext = parseContext(contextRaw, { slug: entry.slug, name: entry.name })

    const engine = new DiffEngine()
    const { updatedContent } = engine.apply(parsedContext, diff)

    if (spinner !== null) spinner.text = 'Writing context.md…'
    writeLayer(entry.slug, 'context', updatedContent)

    if (spinner !== null) spinner.text = 'Committing to store…'
    const storePath = projectStorePath(entry.slug)
    const commitHash = await gitCommit(storePath, diff.commitMessage)

    if (spinner !== null) spinner.text = 'Clearing pending diff…'
    clearPendingDiff(entry.slug)

    if (spinner !== null) spinner.succeed('Diff applied and committed.')

    if (options.json === true) {
      console.log(JSON.stringify({
        slug: entry.slug,
        name: entry.name,
        committed: true,
        commitHash: commitHash.slice(0, 8),
        message: diff.commitMessage,
        changes: diff.preview,
      }, null, 2))
      return
    }

    blank()
    label('Commit', commitHash.slice(0, 8))
    label('Message', diff.commitMessage)
    label('Changes', diff.preview.summary)
    blank()

    success('Context updated successfully.')
    info('Run  mexai status  to see the current project state.')
  } catch (err) {
    if (options.json === true) {
      console.log(JSON.stringify({ committed: false, error: err instanceof Error ? err.message : String(err) }))
      process.exitCode = 1
      return
    }
    handleError(err)
  }
}
