/**
 * mexai context-save — CLI parity with the MCP context_save tool.
 *
 * Stages proposed context changes to pending-diff without opening an editor.
 * Mirrors exactly what AI agents do via the MCP context_save tool.
 *
 * Usage:
 *   mexai context-save --message "add decision" \
 *     --decisions '[{"title":"Use Vitest","rationale":"ESM-native"}]'
 *
 *   mexai context-save --current-state "Working on Phase 4" --message "update state"
 *
 *   mexai context-save --from-file changes.json --message "batch update"
 *
 *   mexai context-save --dry-run --message "preview" \
 *     --decisions '[{"title":"Use Vitest","rationale":"ESM-native"}]'
 */

import * as fs from 'node:fs'
import {
  readPendingDiff,
  writePendingDiff,
  DiffEngine,
  parseContext,
  readLayer,
  StoreError,
} from '@mexai/core'
import type { ContextChanges, ProposedDecision, ProposedThread, Layer } from '@mexai/core'
import { success, info, warn, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'
import chalk from 'chalk'

interface ContextSaveOptions {
  slug?: string
  project?: string
  message?: string
  decisions?: string
  currentState?: string
  threads?: string
  source?: string
  fromFile?: string
  dryRun?: boolean
}

export async function runContextSave(options: ContextSaveOptions): Promise<void> {
  try {
    const entry = await resolveFromOptions(options)

    const commitMessage = options.message?.trim()
    if (commitMessage === undefined || commitMessage.length === 0) {
      warn('--message is required. Describe what you are saving.')
      process.exitCode = 1
      return
    }
    if (commitMessage.length > 72) {
      warn('--message must be 72 characters or fewer.')
      process.exitCode = 1
      return
    }

    // Build changes object
    let changes: ContextChanges

    if (options.fromFile !== undefined) {
      if (!fs.existsSync(options.fromFile)) {
        warn(`File not found: ${options.fromFile}`)
        process.exitCode = 1
        return
      }
      try {
        changes = JSON.parse(fs.readFileSync(options.fromFile, 'utf8')) as ContextChanges
      } catch {
        warn(`Could not parse JSON from ${options.fromFile}`)
        process.exitCode = 1
        return
      }
    } else {
      const decisions: ProposedDecision[] | undefined = parseJsonFlag<ProposedDecision[]>(
        options.decisions,
        '--decisions'
      )
      const threads: ProposedThread[] | undefined = parseJsonFlag<ProposedThread[]>(
        options.threads,
        '--threads'
      )
      changes = {
        ...(decisions !== undefined ? { decisions } : {}),
        ...(threads !== undefined ? { openThreads: threads } : {}),
        ...(options.currentState !== undefined ? { currentState: options.currentState.trim() } : {}),
      }
    }

    if (
      (changes.decisions?.length ?? 0) === 0 &&
      (changes.openThreads?.length ?? 0) === 0 &&
      changes.currentState === undefined
    ) {
      warn('No changes provided. Use --decisions, --current-state, --threads, or --from-file.')
      process.exitCode = 1
      return
    }

    const source = isValidSource(options.source) ? options.source : 'manual'

    // Idempotency: skip decisions already committed
    let skipped = 0
    if (changes.decisions !== undefined && changes.decisions.length > 0) {
      const raw = safeReadLayer(entry.slug, 'context')
      if (raw !== null) {
        const ctx = parseContext(raw, { slug: entry.slug, name: entry.name })
        const existing = new Set(ctx.decisions.map((d) => d.title.toLowerCase().trim()))
        const deduped = changes.decisions.filter(
          (d) => !existing.has(d.title.toLowerCase().trim())
        )
        skipped = changes.decisions.length - deduped.length
        changes = { ...changes, decisions: deduped }
      }
    }

    const engine = new DiffEngine()
    const existingDiff = readPendingDiff(entry.slug)
    const diff =
      existingDiff === undefined
        ? engine.build(entry.slug, changes, source, commitMessage, undefined)
        : engine.merge(existingDiff, changes, source, commitMessage, undefined)

    if (options.dryRun !== true) {
      writePendingDiff(entry.slug, diff)
    }

    header('mexai context-save')
    blank()
    label('Project', entry.name)
    label('Source', source)
    label('Message', commitMessage)
    if (options.dryRun === true) {
      label('Mode', chalk.yellow('dry-run (nothing written)'))
    }
    blank()

    console.log(chalk.bold('Preview:'))
    const { preview } = diff
    if (preview.decisionsAdded > 0) {
      console.log(`  ${chalk.green('+')} ${preview.decisionsAdded} decision${preview.decisionsAdded !== 1 ? 's' : ''}`)
    }
    if (preview.threadsAdded > 0) {
      console.log(`  ${chalk.green('+')} ${preview.threadsAdded} thread${preview.threadsAdded !== 1 ? 's' : ''}`)
    }
    if (preview.threadsResolved > 0) {
      console.log(`  ${chalk.cyan('✓')} ${preview.threadsResolved} resolved`)
    }
    if (preview.currentStateChanged) {
      console.log(`  ${chalk.yellow('~')} Current state updated`)
    }
    if (skipped > 0) {
      console.log(`  ${chalk.dim(`(${skipped} duplicate decision${skipped !== 1 ? 's' : ''} skipped)`)}`)
    }

    blank()
    if (options.dryRun === true) {
      info('Dry run — no changes written. Remove --dry-run to stage.')
    } else {
      success('Changes staged. Run  mexai diff  to review,  mexai commit  to apply.')
    }
  } catch (err) {
    if (err instanceof StoreError) {
      warn(err.message)
      process.exitCode = 1
    } else {
      handleError(err)
    }
  }
}

function parseJsonFlag<T>(value: string | undefined, flagName: string): T | undefined {
  if (value === undefined) return undefined
  try {
    return JSON.parse(value) as T
  } catch {
    warn(`${flagName} must be a valid JSON string.`)
    process.exitCode = 1
    return undefined
  }
}

function safeReadLayer(slug: string, layer: Layer): string | null {
  try {
    return readLayer(slug, layer)
  } catch {
    return null
  }
}

const VALID_SOURCES = ['claude-code', 'cursor', 'vscode', 'opencode', 'manual'] as const
type ValidSource = typeof VALID_SOURCES[number]

function isValidSource(v: string | undefined): v is ValidSource {
  return v !== undefined && (VALID_SOURCES as readonly string[]).includes(v)
}
