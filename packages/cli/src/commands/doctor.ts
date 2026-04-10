/**
 * mexai doctor — detect and auto-repair malformed project files.
 *
 * Repairs:
 *   - context.md frontmatter: fills in missing or invalid fields with safe defaults
 *
 * Dry-run by default — shows what would be changed.
 * Use --apply to write repairs to disk.
 */

import * as path from 'node:path'
import * as os from 'node:os'
import * as fs from 'node:fs'
import chalk from 'chalk'
import {
  validateContextFrontmatter,
  repairContextFrontmatter,
  extractRawFrontmatter,
  serializeContext,
  parseContext,
  gitCommit,
  projectStorePath,
} from '@mexai/core'
import { success, info, warn, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface DoctorOptions {
  slug?: string
  project?: string
  apply?: boolean
}

export async function runDoctor(options: DoctorOptions): Promise<void> {
  try {
    const entry = await resolveFromOptions(options)
    const storeDir = path.join(os.homedir(), '.mexai', 'projects', entry.slug)
    const contextPath = path.join(storeDir, 'context.md')

    header(`Doctor — ${entry.name}`)
    blank()
    label('Slug', entry.slug)
    if (options.apply !== true) {
      label('Mode', chalk.yellow('dry-run (use --apply to write changes)'))
    } else {
      label('Mode', chalk.green('apply'))
    }
    blank()

    if (!fs.existsSync(contextPath)) {
      warn('context.md not found. Run  mexai init  to create a project first.')
      process.exitCode = 1
      return
    }

    const raw = fs.readFileSync(contextPath, 'utf8')
    const err = validateContextFrontmatter(raw)

    if (err === null) {
      success('context.md frontmatter is already valid. No repairs needed.')
      return
    }

    // Frontmatter is invalid — show the issues
    warn('context.md has frontmatter issues:')
    const lines = err.split('\n')
    for (const line of lines) {
      console.log(`  ${chalk.dim(line)}`)
    }
    blank()

    // Run repair
    const original = extractRawFrontmatter(raw)
    const repaired = repairContextFrontmatter(original, {
      slug: entry.slug,
      name: entry.name,
    })

    // Show what will be repaired
    console.log(chalk.bold('Repairs:'))
    const fields: (keyof typeof repaired)[] = ['name', 'slug', 'domain', 'stack', 'status', 'createdAt', 'updatedAt']
    for (const field of fields) {
      const before = original[field]
      const after = repaired[field]
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        console.log(
          `  ${chalk.yellow('~')} ${chalk.bold(field)}:  ` +
          chalk.red(JSON.stringify(before)) +
          chalk.dim(' → ') +
          chalk.green(JSON.stringify(after))
        )
      }
    }

    blank()

    if (options.apply !== true) {
      info('Run  mexai doctor --apply  to write these repairs to disk.')
      return
    }

    // Apply repair by re-serializing with fixed frontmatter + original body
    const ctx = parseContext(raw, { slug: entry.slug, name: entry.name })
    // parseContext already uses repairContextFrontmatter, so ctx.frontmatter is repaired
    const fixedContent = serializeContext(ctx)
    fs.writeFileSync(contextPath, fixedContent, 'utf8')

    // Commit the repair to store git so storeDirty transitions to clean
    const storePath = projectStorePath(entry.slug)
    await gitCommit(storePath, 'mexai: doctor — repair context.md frontmatter')

    blank()
    success('context.md frontmatter repaired, committed, and store is now clean.')
    info('Run  mexai validate  to confirm all checks pass.')
  } catch (err) {
    handleError(err)
  }
}
