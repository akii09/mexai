/**
 * Project resolution helpers.
 *
 * Resolution order (first match wins):
 * 1. --project / --slug flag (explicit override)
 * 2. mexai.json found by walking up from cwd  ← definitive auto-detection
 * 3. Interactive selection (TTY only)          ← always explicit, never ambiguous
 * 4. NO_ACTIVE_PROJECT error
 *
 * Steps 3 and 4 from the old chain (registry path prefix match and active
 * fallback) are intentionally removed — they caused wrong-project detection
 * when multiple projects had overlapping paths.
 */

import * as path from 'node:path'
import * as os from 'node:os'
import inquirer from 'inquirer'
import type { RegistryEntry } from '@mexai/core'
import { resolveProject, readProjectLink, listProjects, getActive } from '@mexai/core'
import { info, blank } from './output.js'

/**
 * Walk from `dir` up to the filesystem root (stopping at home dir boundary)
 * looking for a mexai.json link file. Returns the slug from the first one found.
 */
export function findProjectLinkInTree(startDir: string): string | undefined {
  const home = os.homedir()
  let current = startDir
  const visited = new Set<string>()

  while (current && !visited.has(current)) {
    visited.add(current)
    const slug = readProjectLink(current)
    if (slug !== undefined) return slug

    const parent = path.dirname(current)
    // Stop if we've hit root or gone above home dir
    if (parent === current || (current === home && startDir !== home)) break
    current = parent
  }
  return undefined
}

/**
 * Show an interactive project picker using inquirer.
 * Returns the selected RegistryEntry, or throws if the user cancels.
 */
async function pickProject(): Promise<RegistryEntry> {
  const projects = listProjects()
  const activeSlug = getActive()

  if (projects.length === 0) {
    throw new Error('No projects found. Run  mexai init  to create one.')
  }

  if (projects.length === 1 && projects[0] !== undefined) {
    const single = projects[0]
    info(`Auto-selected project: ${single.name}`)
    return resolveProject({ slug: single.slug })
  }

  blank()
  info('Multiple projects found — select one:')

  const choices = projects.map((p) => ({
    name: `${p.slug === activeSlug ? '▶ ' : '  '}${p.name}  ${formatPath(p.path)}${p.hasPendingDiff ? '  [pending diff]' : ''}`,
    value: p.slug,
    short: p.name,
  }))

  const answer = await inquirer.prompt<{ slug: string }>([
    {
      type: 'list',
      name: 'slug',
      message: 'Select a project:',
      choices,
      default: activeSlug,
    },
  ])

  return resolveProject({ slug: answer.slug })
}

/**
 * Resolve the active project from CLI options.
 *
 * Resolution order:
 * 1. --project / --slug flag
 * 2. mexai.json found walking up from cwd
 * 3. Interactive selection (TTY only)
 */
export async function resolveFromOptions(opts: {
  slug?: string | undefined
  project?: string | undefined
}): Promise<RegistryEntry> {
  const cwd = process.cwd()

  // 1. Explicit flag — highest priority, always unambiguous
  const explicitSlug = opts.slug ?? opts.project
  if (explicitSlug !== undefined) {
    return resolveProject({ slug: explicitSlug })
  }

  // 2. mexai.json walk-up — definitive auto-detection
  const linkedSlug = findProjectLinkInTree(cwd)
  if (linkedSlug !== undefined) {
    try {
      return resolveProject({ slug: linkedSlug })
    } catch {
      // Stale mexai.json pointing to a deleted project — fall through to picker
    }
  }

  // 3. Interactive selection (TTY only) — always explicit, never ambiguous
  if (process.stdout.isTTY) {
    return pickProject()
  }

  // Non-TTY with no mexai.json — cannot proceed
  throw new Error(
    'Could not determine which project to use.\n' +
    '  • Run  mexai init  to create a project and write mexai.json\n' +
    '  • Or pass  --project <slug>  to specify explicitly'
  )
}

function formatPath(p: string): string {
  const home = os.homedir()
  const short = p.startsWith(home) ? '~' + p.slice(home.length) : p
  return short.length > 45 ? '…' + short.slice(short.length - 42) : short
}
