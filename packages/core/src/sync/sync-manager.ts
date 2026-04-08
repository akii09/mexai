/**
 * SyncManager — GitHub sync for the project store.
 *
 * Phase 5 stub. Full implementation in Phase 5 (Sync + Polish).
 * Wired to `mexai sync` CLI subcommands.
 */

import type { SyncPushResult, SyncPullResult, SyncStatus } from '../types.js'
import { StoreError } from '../types.js'

const NOT_YET = (): StoreError =>
  new StoreError('SYNC_ERROR', 'GitHub sync not yet implemented — coming in Phase 5.')

/**
 * Initialise a GitHub remote for the project store.
 * Creates a new GitHub repo and pushes the project directory.
 */
export function initRemote(
  _slug: string,
  _repoName: string,
  _visibility: 'public' | 'private'
): Promise<void> {
  return Promise.reject(NOT_YET())
}

/**
 * Clone a remote project store into the local ~/.mexai/ directory.
 */
export function cloneRemote(_url: string, _slug: string): Promise<void> {
  return Promise.reject(NOT_YET())
}

/**
 * Push local store changes to the registered remote.
 */
export function push(_slug: string): Promise<SyncPushResult> {
  return Promise.reject(NOT_YET())
}

/**
 * Pull remote changes into the local store.
 * Detects conflicts and returns them without corrupting local state.
 */
export function pull(_slug: string): Promise<SyncPullResult> {
  return Promise.reject(NOT_YET())
}

/**
 * Pull then push (safe sync order).
 */
export function sync(_slug: string): Promise<void> {
  return Promise.reject(NOT_YET())
}

/**
 * Return current sync status for the project.
 */
export function status(_slug: string): Promise<SyncStatus> {
  return Promise.reject(NOT_YET())
}
