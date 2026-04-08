/**
 * mexai list — display all projects in the store as a table.
 */

import chalk from 'chalk'
import { listProjects, getActive } from '@mexai/core'
import { blank, header, dim, pendingBadge } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'

export function runList(): void {
  try {
    header('mexai list')
    blank()

    const projects = listProjects()
    const activeSlug = getActive()

    if (projects.length === 0) {
      dim('No projects found. Run  mexai init  to create one.')
      return
    }

    // Calculate column widths
    const slugWidth = Math.max(4, ...projects.map((p) => p.slug.length))
    const nameWidth = Math.max(4, ...projects.map((p) => p.name.length))
    const pathWidth = Math.min(40, Math.max(4, ...projects.map((p) => truncatePath(p.path).length)))

    // Header row
    const header2 = [
      ''.padEnd(2),   // active indicator
      chalk.dim('SLUG'.padEnd(slugWidth)),
      chalk.dim('NAME'.padEnd(nameWidth)),
      chalk.dim('PATH'.padEnd(pathWidth)),
      chalk.dim('UPDATED'),
    ].join('  ')
    console.log(header2)
    console.log(chalk.dim('─'.repeat(2 + 2 + slugWidth + 2 + nameWidth + 2 + pathWidth + 2 + 10)))

    for (const p of projects) {
      const isActive = p.slug === activeSlug
      const activeIndicator = isActive ? chalk.green('▶') : ' '
      const slugStr = isActive ? chalk.green(p.slug.padEnd(slugWidth)) : p.slug.padEnd(slugWidth)
      const nameStr = p.name.padEnd(nameWidth)
      const pathStr = truncatePath(p.path).padEnd(pathWidth)
      const updatedStr = formatDate(p.updatedAt)
      const pending = p.hasPendingDiff ? '  ' + pendingBadge() : ''

      console.log(
        [activeIndicator, slugStr, nameStr, chalk.dim(pathStr), chalk.dim(updatedStr) + pending].join('  ')
      )
    }

    blank()
    dim(`${projects.length} project${projects.length !== 1 ? 's' : ''} total.`)
    if (activeSlug !== undefined) {
      dim(`Active: ${activeSlug}`)
    }
  } catch (err) {
    handleError(err)
  }
}

function truncatePath(p: string): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? ''
  const relative = p.startsWith(home) ? '~' + p.slice(home.length) : p
  if (relative.length <= 40) return relative
  return '…' + relative.slice(relative.length - 37)
}

function formatDate(iso: string): string {
  return iso.slice(0, 10)
}
