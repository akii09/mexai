/**
 * Centralized error handler for CLI commands.
 * Formats StoreError and unexpected errors consistently.
 */

import { StoreError } from '@mexai/core'
import { error, dim } from './output.js'

/**
 * Handle any thrown error from a CLI command.
 * Formats StoreError with its code, unknown errors with a generic message.
 * Always exits the process with code 1.
 */
export function handleError(err: unknown): never {
  if (err instanceof StoreError) {
    error(err.message)
    dim(`  error code: ${err.code}`)
  } else if (err instanceof Error) {
    error(err.message)
  } else {
    error('An unexpected error occurred.')
    if (typeof err === 'string') {
      dim(`  ${err}`)
    }
  }
  process.exit(1)
}

/**
 * Wrap an async command handler to catch and format errors.
 */
export function withErrorHandler<T extends unknown[]>(
  fn: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T): Promise<void> => {
    try {
      await fn(...args)
    } catch (err) {
      handleError(err)
    }
  }
}
