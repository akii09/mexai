/**
 * mexai export — write flat context files to the current project directory.
 *
 * Generates AGENTS.md, CLAUDE.md, and .cursorrules from the project store
 * and writes them to the project root (entry.path). For AI editors that
 * don't support MCP and read flat files instead.
 *
 * All three files include: Rules, Identity, Current State, and all Decisions.
 *
 * After writing, prints a completeness summary showing which sections are
 * populated across all export targets.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import chalk from 'chalk'
import ora from 'ora'
import {
  exportAgentsMd,
  exportClaudeMd,
  exportCursorRules,
  auditExportCompleteness,
} from '@mexai/core'
import { success, warn, blank, header, label, dim } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface ExportOptions {
  slug?: string
  project?: string
  dir?: string
  json?: boolean
}

export async function runExport(options: ExportOptions): Promise<void> {
  try {
    const entry = await resolveFromOptions(options)
    const outputDir = options.dir !== undefined ? path.resolve(options.dir) : process.cwd()

    if (options.json !== true) {
      header('mexai export')
      blank()
    }

    const spinner = options.json !== true ? ora('Generating context files…').start() : null

    const agentsMd = exportAgentsMd(entry.slug)
    const claudeMd = exportClaudeMd(entry.slug)
    const cursorRules = exportCursorRules(entry.slug)

    if (spinner !== null) spinner.text = 'Writing files…'
    fs.writeFileSync(path.join(outputDir, 'AGENTS.md'), agentsMd, 'utf8')
    fs.writeFileSync(path.join(outputDir, 'CLAUDE.md'), claudeMd, 'utf8')
    fs.writeFileSync(path.join(outputDir, '.cursorrules'), cursorRules, 'utf8')

    if (spinner !== null) spinner.succeed('Files exported.')

    // Completeness audit
    const completeness = auditExportCompleteness(entry.slug)
    const allComplete = completeness.every((c) => c.complete)

    if (options.json === true) {
      console.log(JSON.stringify({
        slug: entry.slug,
        name: entry.name,
        outputDir,
        files: ['AGENTS.md', 'CLAUDE.md', '.cursorrules'],
        completeness,
        allComplete,
      }, null, 2))
      return
    }

    blank()
    label('Output directory', outputDir)
    blank()

    // File list with completeness
    for (const c of completeness) {
      const icon = c.complete ? chalk.green('✓') : chalk.yellow('!')
      console.log(`  ${icon}  ${chalk.bold(c.target)}`)
    }

    blank()
    console.log(chalk.bold('Completeness:'))
    const checks = [
      { label: 'Identity', ok: completeness[0]?.hasIdentity ?? false },
      { label: 'Current State', ok: completeness[0]?.hasCurrentState ?? false },
      { label: 'Decisions', ok: completeness[0]?.hasDecisions ?? false },
      { label: 'Rules', ok: completeness[0]?.hasRules ?? false },
    ]
    for (const c of checks) {
      const icon = c.ok ? chalk.green('✓') : chalk.dim('○')
      console.log(`  ${icon}  ${c.label}${!c.ok ? chalk.dim('  (not yet added — run mexai context-save or mexai edit)') : ''}`)
    }

    blank()
    if (allComplete) {
      success('All export targets are complete.')
    } else {
      warn('Some sections are missing. Add them to improve AI context quality.')
    }

    blank()
    dim('These files are generated — edit your context via  mexai edit  instead.')
    dim('Re-run  mexai export  after committing a diff to regenerate them.')
  } catch (err) {
    if (options.json === true) {
      console.log(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }))
      process.exitCode = 1
      return
    }
    handleError(err)
  }
}
