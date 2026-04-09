/**
 * mexai apply — atomic pipeline: stage changes and commit immediately.
 *
 * Combines  mexai context-save + mexai commit  into one command.
 * Designed for CI, scripts, and agent workflows that want minimal ceremony.
 *
 * Usage:
 *   mexai apply --from-file changes.json --message "batch update"
 *
 *   mexai apply \
 *     --decisions '[{"title":"Use ESM","rationale":"Simpler toolchain"}]' \
 *     --message "record decision"
 *
 * Flags:
 *   --from-file <path>     JSON file with ContextChanges (decisions, openThreads, currentState)
 *   --decisions <json>     Inline JSON array of proposed decisions
 *   --current-state <str>  Replace current state
 *   --threads <json>       Inline JSON array of proposed threads
 *   --message <str>        Commit message (required, max 72 chars)
 *   --validate             Run mexai validate before committing (fail if issues found)
 *   --source <str>         Context source (default: manual)
 *   -p, --project <slug>   Project slug (defaults to auto-detect)
 */

import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import ora from 'ora'
import {
  DiffEngine,
  writePendingDiff,
  readPendingDiff,
  clearPendingDiff,
  readLayer,
  parseContext,
  serializeContext,
  writeLayer,
  gitCommit,
  projectStorePath,
  validateContextFrontmatter,
  StoreError,
} from '@mexai/core'
import type { ContextChanges, ProposedDecision, ProposedThread, Layer } from '@mexai/core'
import { success, warn, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'
import chalk from 'chalk'

interface ApplyOptions {
  slug?: string
  project?: string
  message?: string
  decisions?: string
  currentState?: string
  threads?: string
  source?: string
  fromFile?: string
  validate?: boolean
}

export async function runApply(options: ApplyOptions): Promise<void> {
  try {
    const entry = await resolveFromOptions(options)

    const commitMessage = options.message?.trim()
    if (commitMessage === undefined || commitMessage.length === 0) {
      warn('--message is required.')
      process.exitCode = 1
      return
    }
    if (commitMessage.length > 72) {
      warn('--message must be 72 characters or fewer.')
      process.exitCode = 1
      return
    }

    // Build changes
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
      const decisions = parseJsonFlag<ProposedDecision[]>(options.decisions, '--decisions')
      const threads = parseJsonFlag<ProposedThread[]>(options.threads, '--threads')
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
    const storePath = projectStorePath(entry.slug)
    const storeDir = path.join(os.homedir(), '.mexai', 'projects', entry.slug)

    // Optional validate step
    if (options.validate === true) {
      const contextPath = path.join(storeDir, 'context.md')
      if (fs.existsSync(contextPath)) {
        const raw = fs.readFileSync(contextPath, 'utf8')
        const err = validateContextFrontmatter(raw)
        if (err !== null) {
          warn('Validation failed — context.md has frontmatter issues:')
          console.log(err)
          blank()
          warn('Fix with  mexai doctor --apply  before running  mexai apply  again.')
          process.exitCode = 1
          return
        }
      }
    }

    header('mexai apply')
    blank()
    label('Project', entry.name)
    label('Message', commitMessage)
    blank()

    const spinner = ora('Applying changes…').start()

    // Stage
    const engine = new DiffEngine()
    const existing = readPendingDiff(entry.slug)
    const diff =
      existing === undefined
        ? engine.build(entry.slug, changes, source, commitMessage, undefined)
        : engine.merge(existing, changes, source, commitMessage, undefined)
    writePendingDiff(entry.slug, diff)

    // Apply (same logic as mexai commit)
    const contextRaw = safeReadLayer(entry.slug, 'context')
    if (contextRaw === null) {
      spinner.fail('context.md not found.')
      process.exitCode = 1
      return
    }

    const ctx = parseContext(contextRaw, { slug: entry.slug, name: entry.name })

    // Apply decisions
    if (diff.changes.decisions !== undefined) {
      const today = new Date().toISOString().slice(0, 10)
      for (const d of diff.changes.decisions) {
        ctx.decisions.push({ date: d.date ?? today, title: d.title, rationale: d.rationale })
      }
    }

    // Apply threads
    if (diff.changes.openThreads !== undefined) {
      for (const t of diff.changes.openThreads) {
        if (t.action === 'add') {
          ctx.openThreads.push({ content: t.content, resolved: false, addedAt: new Date().toISOString().slice(0, 10) })
        } else {
          const match = ctx.openThreads.find(
            (e) => e.content.toLowerCase().trim() === t.content.toLowerCase().trim()
          )
          if (match !== undefined) match.resolved = true
        }
      }
    }

    // Apply current state
    if (diff.changes.currentState !== undefined) {
      ctx.currentState = diff.changes.currentState
    }

    ctx.frontmatter.updatedAt = new Date().toISOString()
    writeLayer(entry.slug, 'context', serializeContext(ctx))
    clearPendingDiff(entry.slug)

    await gitCommit(storePath, commitMessage)

    spinner.succeed('Changes applied and committed.')
    blank()
    success(`Committed: ${commitMessage}`)

    const { preview } = diff
    if (preview.decisionsAdded > 0) console.log(`  ${chalk.green('+')} ${preview.decisionsAdded} decision${preview.decisionsAdded !== 1 ? 's' : ''} added`)
    if (preview.threadsAdded > 0) console.log(`  ${chalk.green('+')} ${preview.threadsAdded} thread${preview.threadsAdded !== 1 ? 's' : ''} added`)
    if (preview.threadsResolved > 0) console.log(`  ${chalk.cyan('✓')} ${preview.threadsResolved} thread${preview.threadsResolved !== 1 ? 's' : ''} resolved`)
    if (preview.currentStateChanged) console.log(`  ${chalk.yellow('~')} Current state updated`)
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
