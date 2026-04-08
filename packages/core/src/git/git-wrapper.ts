/**
 * GitWrapper — thin abstraction over simple-git for store operations.
 * All methods operate on the project's store directory (~/.mexai/projects/<slug>/).
 */

import { simpleGit } from 'simple-git'
import type { GitLogEntry } from '../types.js'
import { StoreError } from '../types.js'

/**
 * Initialise a git repo at the given path.
 * Safe to call on an already-initialised repo.
 */
export async function init(projectPath: string): Promise<void> {
  try {
    const git = simpleGit(projectPath)
    await git.init()
  } catch (err) {
    throw new StoreError('GIT_ERROR', `Failed to initialise git repo at ${projectPath}: ${String(err)}`)
  }
}

/**
 * Stage all changes and create a commit.
 */
export async function commit(projectPath: string, message: string): Promise<string> {
  try {
    const git = simpleGit(projectPath)
    await git.add('.')
    const result = await git.commit(message)
    return result.commit
  } catch (err) {
    throw new StoreError('GIT_ERROR', `Failed to commit at ${projectPath}: ${String(err)}`)
  }
}

/**
 * Return the last n log entries for the project store.
 */
export async function log(projectPath: string, n = 10): Promise<GitLogEntry[]> {
  try {
    const git = simpleGit(projectPath)
    const result = await git.log({ maxCount: n })
    return result.all.map((entry) => ({
      hash: entry.hash,
      message: entry.message,
      date: entry.date,
      author: entry.author_name,
    }))
  } catch (err) {
    throw new StoreError('GIT_ERROR', `Failed to read git log at ${projectPath}: ${String(err)}`)
  }
}

/**
 * Restore the project store to a specific commit hash.
 * Destructive — discards all uncommitted changes.
 */
export async function restore(projectPath: string, hash: string): Promise<void> {
  try {
    const git = simpleGit(projectPath)
    await git.checkout(hash)
  } catch (err) {
    throw new StoreError('GIT_ERROR', `Failed to restore to ${hash} at ${projectPath}: ${String(err)}`)
  }
}

/**
 * Return true if there are uncommitted changes in the project store.
 */
export async function isDirty(projectPath: string): Promise<boolean> {
  try {
    const git = simpleGit(projectPath)
    const status = await git.status()
    return !status.isClean()
  } catch (err) {
    throw new StoreError('GIT_ERROR', `Failed to check git status at ${projectPath}: ${String(err)}`)
  }
}
