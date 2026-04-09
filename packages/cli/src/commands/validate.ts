/**
 * mexai validate — check project files for integrity issues.
 *
 * Checks:
 *   1. context.md frontmatter is valid (all required keys present and typed correctly)
 *   2. No duplicate decision titles
 *   3. codebase.md and rules.md exist and are non-empty
 *
 * Use --fix to auto-repair issues (delegates to mexai doctor).
 */

import * as path from 'node:path'
import * as os from 'node:os'
import * as fs from 'node:fs'
import chalk from 'chalk'
import {
  validateContextFrontmatter,
  parseContext,
} from '@mexai/core'
import type { Layer } from '@mexai/core'
import { info, warn, success, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface ValidateOptions {
  slug?: string
  project?: string
}

export async function runValidate(options: ValidateOptions): Promise<void> {
  try {
    const entry = await resolveFromOptions(options)
    const storeDir = path.join(os.homedir(), '.mexai', 'projects', entry.slug)

    header(`Validate — ${entry.name}`)
    blank()
    label('Slug', entry.slug)
    label('Store', storeDir)
    blank()

    const issues: string[] = []
    const checks: { label: string; ok: boolean; detail?: string }[] = []

    // ── 1. context.md frontmatter ────────────────────────────────────────────
    const contextPath = path.join(storeDir, 'context.md')
    if (!fs.existsSync(contextPath)) {
      checks.push({ label: 'context.md exists', ok: false, detail: 'File not found' })
      issues.push('context.md is missing')
    } else {
      const raw = fs.readFileSync(contextPath, 'utf8')
      const fmErr = validateContextFrontmatter(raw)
      if (fmErr !== null) {
        checks.push({ label: 'context.md frontmatter', ok: false, detail: fmErr })
        issues.push('context.md has invalid frontmatter')
      } else {
        checks.push({ label: 'context.md frontmatter', ok: true })
      }

      // ── 2. No duplicate decision titles ─────────────────────────────────
      try {
        const ctx = parseContext(raw, { slug: entry.slug, name: entry.name })
        const titles = ctx.decisions.map((d) => d.title.toLowerCase().trim())
        const dupes = titles.filter((t, i) => titles.indexOf(t) !== i)
        if (dupes.length > 0) {
          const dupeList = [...new Set(dupes)].join(', ')
          checks.push({ label: 'No duplicate decisions', ok: false, detail: `Duplicates: ${dupeList}` })
          issues.push(`Duplicate decision titles: ${dupeList}`)
        } else {
          checks.push({ label: 'No duplicate decisions', ok: true })
        }
      } catch {
        checks.push({ label: 'No duplicate decisions', ok: false, detail: 'Could not parse context.md' })
      }
    }

    // ── 3. codebase.md exists and non-empty ──────────────────────────────────
    checkLayerFile(storeDir, 'codebase', checks, issues)

    // ── 4. rules.md exists and non-empty ────────────────────────────────────
    checkLayerFile(storeDir, 'rules', checks, issues)

    // ── Output ────────────────────────────────────────────────────────────────
    for (const check of checks) {
      const icon = check.ok ? chalk.green('✓') : chalk.red('✗')
      console.log(`  ${icon}  ${check.label}`)
      if (!check.ok && check.detail !== undefined) {
        const lines = check.detail.split('\n')
        for (const line of lines) {
          console.log(`       ${chalk.dim(line)}`)
        }
      }
    }

    blank()
    if (issues.length === 0) {
      success(`All checks passed (${checks.length}/${checks.length})`)
    } else {
      warn(`${issues.length} issue${issues.length !== 1 ? 's' : ''} found.`)
      blank()
      info('Run  mexai doctor  to automatically fix frontmatter issues.')
    }
  } catch (err) {
    handleError(err)
  }
}

function checkLayerFile(
  storeDir: string,
  layer: Layer,
  checks: { label: string; ok: boolean; detail?: string }[],
  issues: string[]
): void {
  const filePath = path.join(storeDir, `${layer}.md`)
  if (!fs.existsSync(filePath)) {
    checks.push({ label: `${layer}.md exists`, ok: false, detail: 'File not found — run  mexai map  or  mexai edit' })
    issues.push(`${layer}.md is missing`)
    return
  }
  const content = fs.readFileSync(filePath, 'utf8').trim()
  if (content.length < 10) {
    checks.push({ label: `${layer}.md has content`, ok: false, detail: 'File appears empty' })
    issues.push(`${layer}.md is empty`)
  } else {
    checks.push({ label: `${layer}.md exists and has content`, ok: true })
  }
}

