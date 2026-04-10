/**
 * mexai map — scan the codebase and generate/update codebase.md (Layer 2).
 *
 * Runs a static analysis of the project root, generates a DRAFT codebase.md,
 * and writes it to the store. Requires the project to be initialised first.
 *
 * Flags:
 *   --quality standard|strict
 *     standard (default): scan, generate draft, write — always succeeds
 *     strict: validate existing codebase.md BEFORE regenerating. Fails if
 *             Key Files, Conventions, Patterns, or Do Not Touch are empty.
 *             Use as a CI gate to enforce complete codebase documentation.
 *
 *   --json: machine-readable output (CI-safe)
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
  parseCodebase,
  readLayer,
  StoreError,
} from '@mexai/core'
import { info, warn, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface MapOptions {
  slug?: string
  project?: string
  quality?: string
  json?: boolean
}

type QualityMode = 'standard' | 'strict'

/** Sections that must have real content in strict quality mode. */
const STRICT_SECTIONS = ['keyFiles', 'conventions', 'patterns', 'doNotTouch'] as const
const SECTION_LABELS: Record<typeof STRICT_SECTIONS[number], string> = {
  keyFiles: 'Key Files',
  conventions: 'Conventions',
  patterns: 'Patterns',
  doNotTouch: 'Do Not Touch',
}

export async function runMap(options: MapOptions): Promise<void> {
  const quality: QualityMode = options.quality === 'strict' ? 'strict' : 'standard'

  try {
    const entry = await resolveFromOptions(options)

    const scanRoot = process.cwd()
    if (entry.path !== scanRoot) {
      linkPath(entry.slug, scanRoot)
    }
    writeProjectLink(scanRoot, entry.slug)

    // ── Strict quality gate: validate existing codebase.md first ─────────────
    if (quality === 'strict') {
      const qualityIssues = validateExistingCodebase(entry.slug)
      if (qualityIssues.length > 0) {
        if (options.json === true) {
          console.log(JSON.stringify({
            slug: entry.slug,
            name: entry.name,
            root: scanRoot,
            quality,
            qualityPassed: false,
            qualityIssues,
            error: `Quality gate failed: ${qualityIssues.length} section${qualityIssues.length !== 1 ? 's' : ''} are empty.`,
          }, null, 2))
          process.exitCode = 1
          return
        }

        header('mexai map — quality gate FAILED')
        blank()
        warn(`Quality mode: strict — ${qualityIssues.length} section${qualityIssues.length !== 1 ? 's' : ''} need content before regenerating.`)
        blank()
        for (const issue of qualityIssues) {
          console.log(`  ✗  ${issue}`)
        }
        blank()
        info('Fill in these sections in  ~/.mexai/projects/' + entry.slug + '/codebase.md')
        info('Run  mexai edit --layer codebase  to open the file.')
        info('Then re-run  mexai map --quality strict  to validate.')
        process.exitCode = 1
        return
      }
    }

    // ── Scan and generate ────────────────────────────────────────────────────
    if (options.json !== true) {
      header('mexai map')
      blank()
    }

    const spinner = options.json !== true ? ora(`Scanning ${scanRoot}…`).start() : null

    const result = scanCodebase(scanRoot)
    const draft = generateDraft(result)

    if (spinner !== null) spinner.text = 'Writing codebase.md…'
    writeLayer(entry.slug, 'codebase', draft)

    const storePath = projectStorePath(entry.slug)
    await gitCommit(storePath, 'mexai: update codebase map')

    if (spinner !== null) spinner.succeed('Codebase map generated.')

    if (options.json === true) {
      console.log(JSON.stringify({
        slug: entry.slug,
        name: entry.name,
        root: scanRoot,
        frameworks: result.frameworks,
        hasTypeScript: result.hasTypeScript,
        strictMode: result.strictMode,
        testFrameworks: result.testFrameworks,
        styling: result.styling,
        quality,
        qualityPassed: true,
        qualityIssues: [],
      }, null, 2))
      return
    }

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
    if (options.json === true) {
      console.log(JSON.stringify({ qualityPassed: false, error: err instanceof Error ? err.message : String(err) }))
      process.exitCode = 1
      return
    }
    handleError(err)
  }
}

/**
 * Validate the existing codebase.md for strict quality mode.
 * Returns a list of human-readable issue strings (empty = all passed).
 */
function validateExistingCodebase(slug: string): string[] {
  const issues: string[] = []

  let raw: string
  try {
    raw = readLayer(slug, 'codebase')
  } catch (err) {
    if (err instanceof StoreError && err.code === 'LAYER_NOT_INITIALIZED') {
      // No existing file — strict mode can't validate what doesn't exist
      // Proceed with generation (first run)
      return []
    }
    throw err
  }

  const cb = parseCodebase(raw)

  for (const key of STRICT_SECTIONS) {
    const content = cb[key].trim()
    if (isPlaceholderOnly(content)) {
      issues.push(`"${SECTION_LABELS[key]}" section is empty — add at least one entry.`)
    }
  }

  return issues
}

/**
 * Returns true if content is empty or contains only HTML comment placeholders.
 */
function isPlaceholderOnly(content: string): boolean {
  if (content.length === 0) return true
  // Strip lines that are only HTML comments or blank
  const meaningful = content
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      return t.length > 0 && !t.startsWith('<!--') && !t.startsWith('-->')
    })
  return meaningful.length === 0
}

