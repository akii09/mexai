/**
 * mexai commit — apply the pending diff and commit to the store.
 *
 * Reads pending-diff.json, applies it to context.md via DiffEngine,
 * writes the updated layer, commits to git, then clears the diff.
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
}

export async function runCommit(options: CommitOptions): Promise<void> {
  try {
    const entry = resolveFromOptions(options)
    const diff = readPendingDiff(entry.slug)

    header(`mexai commit — ${entry.name}`)
    blank()

    if (diff === undefined) {
      info('No pending diff. Nothing to commit.')
      blank()
      info('AI agents write to pending-diff.json when they propose changes.')
      return
    }

    const spinner = ora('Applying diff…').start()

    // Apply the diff to context.md
    const contextRaw = readLayer(entry.slug, 'context')
    const parsedContext = parseContext(contextRaw)

    const engine = new DiffEngine()
    const { updatedContent } = engine.apply(parsedContext, diff)

    spinner.text = 'Writing context.md…'
    writeLayer(entry.slug, 'context', updatedContent)

    spinner.text = 'Committing to store…'
    const storePath = projectStorePath(entry.slug)
    const commitHash = await gitCommit(storePath, diff.commitMessage)

    spinner.text = 'Clearing pending diff…'
    clearPendingDiff(entry.slug)

    spinner.succeed('Diff applied and committed.')
    blank()

    label('Commit', commitHash.slice(0, 8))
    label('Message', diff.commitMessage)
    label('Changes', diff.preview.summary)
    blank()

    success('Context updated successfully.')
    info('Run  mexai status  to see the current project state.')
  } catch (err) {
    handleError(err)
  }
}
