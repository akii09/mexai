/**
 * mexai restore — restore the project store to a specific git commit.
 *
 * Destructive operation — requires confirmation unless --yes is passed.
 */

import inquirer from 'inquirer'
import ora from 'ora'
import { gitRestore, projectStorePath } from '@mexai/core'
import { success, warn, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface RestoreOptions {
  slug?: string
  project?: string
  yes?: boolean
}

interface ConfirmAnswers {
  confirmed: boolean
}

export async function runRestore(hash: string, options: RestoreOptions): Promise<void> {
  try {
    const entry = await resolveFromOptions(options)

    header('mexai restore')
    blank()
    label('Project', entry.name)
    label('Hash', hash)
    blank()

    warn('This will discard all uncommitted changes in the store and check out the given commit.')
    blank()

    if (options.yes !== true) {
      const answers = await inquirer.prompt<ConfirmAnswers>([
        {
          type: 'confirm',
          name: 'confirmed',
          message: `Restore project "${entry.name}" to commit ${hash.slice(0, 8)}?`,
          default: false,
        },
      ])

      if (!answers.confirmed) {
        console.log('Aborted.')
        return
      }
    }

    blank()
    const spinner = ora(`Restoring to ${hash.slice(0, 8)}…`).start()
    const storePath = projectStorePath(entry.slug)
    await gitRestore(storePath, hash)
    spinner.succeed('Restored.')

    blank()
    success(`Project restored to ${hash.slice(0, 8)}.`)
    blank()
    label('Run  mexai log    to view commit history.', '')
    label('Run  mexai status  to verify the state.', '')
  } catch (err) {
    handleError(err)
  }
}
