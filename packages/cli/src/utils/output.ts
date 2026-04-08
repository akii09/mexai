/**
 * Output utilities — chalk-based formatted terminal output.
 * All CLI output goes through these helpers to ensure consistency.
 */

import chalk from 'chalk'

// ---------------------------------------------------------------------------
// Status symbols
// ---------------------------------------------------------------------------

export const symbols = {
  success: chalk.green('✓'),
  warn: chalk.yellow('!'),
  error: chalk.red('✗'),
  info: chalk.cyan('→'),
  pending: chalk.yellow('◉'),
  bullet: chalk.dim('·'),
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

export function success(message: string): void {
  console.log(`${symbols.success} ${message}`)
}

export function warn(message: string): void {
  console.warn(`${symbols.warn} ${chalk.yellow(message)}`)
}

export function error(message: string): void {
  console.error(`${symbols.error} ${chalk.red(message)}`)
}

export function info(message: string): void {
  console.log(`${symbols.info} ${chalk.cyan(message)}`)
}

export function dim(message: string): void {
  console.log(chalk.dim(message))
}

export function blank(): void {
  console.log()
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function header(title: string): void {
  console.log()
  console.log(chalk.bold(title))
  console.log(chalk.dim('─'.repeat(Math.min(title.length, 60))))
}

export function label(key: string, value: string): void {
  console.log(`  ${chalk.dim(key + ':')} ${value}`)
}

export function badge(text: string, color: 'green' | 'yellow' | 'red' | 'cyan' | 'dim' = 'cyan'): string {
  const colorFn = chalk[color]
  return colorFn(`[${text}]`)
}

/** Format a pending diff badge. */
export function pendingBadge(): string {
  return badge('pending diff', 'yellow')
}

/** Format a table row. */
export function tableRow(cols: string[], widths: number[]): string {
  return cols
    .map((col, i) => col.padEnd(widths[i] ?? 0))
    .join('  ')
}
