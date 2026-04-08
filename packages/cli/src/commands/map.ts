/**
 * mexai map — scan the codebase and generate/update codebase.md (Layer 2).
 *
 * Runs a static analysis of the project root, generates a DRAFT codebase.md,
 * and writes it to the store. Requires the project to be initialised first.
 */

import ora from 'ora'
import {
  scanCodebase,
  generateDraft,
  writeLayer,
  gitCommit,
  projectStorePath,
  linkPath,
  writeProjectLink,
} from '@mexai/core'
import { info, warn, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface MapOptions {
  slug?: string
  project?: string
}

export async function runMap(options: MapOptions): Promise<void> {
  try {
    const entry = await resolveFromOptions(options)

    // Scan from cwd — the directory the user is currently in.
    // If this differs from the stored path, update the registry so future
    // commands resolve to this directory automatically.
    const scanRoot = process.cwd()
    if (entry.path !== scanRoot) {
      linkPath(entry.slug, scanRoot)
      info(`Updated project path: ${entry.path} → ${scanRoot}`)
    }
    writeProjectLink(scanRoot, entry.slug)

    header('mexai map')
    blank()

    const spinner = ora(`Scanning ${scanRoot}…`).start()

    const result = scanCodebase(scanRoot)
    const draft = generateDraft(result)

    spinner.text = 'Writing codebase.md…'
    writeLayer(entry.slug, 'codebase', draft)

    const storePath = projectStorePath(entry.slug)
    await gitCommit(storePath, 'mexai: update codebase map')

    spinner.succeed('Codebase map generated.')
    blank()

    label('Project', entry.name)
    label('Root', scanRoot)
    label('Frameworks', result.frameworks.length > 0 ? result.frameworks.join(', ') : '(none detected)')
    label('TypeScript', result.hasTypeScript ? (result.strictMode ? 'yes (strict)' : 'yes') : 'no')
    label('Test frameworks', result.testFrameworks.length > 0 ? result.testFrameworks.join(', ') : '(none detected)')
    blank()

    warn('Codebase map is a DRAFT — review and edit ~/.mexai/projects/' + entry.slug + '/codebase.md')
    info('Run  mexai edit --layer codebase  to open the file for editing.')
  } catch (err) {
    handleError(err)
  }
}
