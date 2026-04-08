/**
 * mexai export — write flat context files to the current project directory.
 *
 * Generates AGENTS.md, CLAUDE.md, and .cursorrules from the project store
 * and writes them to the project root (entry.path). For AI editors that
 * don't support MCP and read flat files instead.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import ora from 'ora'
import {
  exportAgentsMd,
  exportClaudeMd,
  exportCursorRules,
} from '@mexai/core'
import { success, blank, header, label, dim } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface ExportOptions {
  slug?: string
  project?: string
  dir?: string
}

export async function runExport(options: ExportOptions): Promise<void> {
  try {
    const entry = await resolveFromOptions(options)
    // Default output dir is cwd (where the user is running from), not the
    // stored entry.path — this way files land in the project the user has open.
    const outputDir = options.dir !== undefined ? path.resolve(options.dir) : process.cwd()

    header('mexai export')
    blank()

    const spinner = ora('Generating context files…').start()

    const agentsMd = exportAgentsMd(entry.slug)
    const claudeMd = exportClaudeMd(entry.slug)
    const cursorRules = exportCursorRules(entry.slug)

    spinner.text = 'Writing files…'
    fs.writeFileSync(path.join(outputDir, 'AGENTS.md'), agentsMd, 'utf8')
    fs.writeFileSync(path.join(outputDir, 'CLAUDE.md'), claudeMd, 'utf8')
    fs.writeFileSync(path.join(outputDir, '.cursorrules'), cursorRules, 'utf8')

    spinner.succeed('Files exported.')
    blank()

    label('Output directory', outputDir)
    blank()

    success('AGENTS.md')
    success('CLAUDE.md')
    success('.cursorrules')

    blank()
    dim('These files are generated — edit your context via  mexai edit  instead.')
    dim('Re-run  mexai export  after committing a diff to regenerate them.')
  } catch (err) {
    handleError(err)
  }
}
