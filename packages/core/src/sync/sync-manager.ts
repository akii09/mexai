/**
 * SyncManager — GitHub sync for the project store.
 *
 * Phase 5 stub. Full implementation in Phase 5 (Sync + Polish).
 * Wired to `mexai sync` CLI subcommands.
 */

import type { SyncPushResult, SyncPullResult, SyncStatus } from '../types.js'
import { StoreError } from '../types.js'

/**
 * Initialise a GitHub remote for the project store.
 * Creates a new GitHub repo and pushes the project directory.
 */
export async function initRemote(
  _slug: string,
  _repoName: string,
  _visibility: 'public' | 'private'
): Promise<void> {
  throw new StoreError('SYNC_ERROR', 'GitHub sync not yet implemented — coming in Phase 5.')
}

/**
 * Clone a remote project store into the local ~/.mexai/ directory.
 */
export async function cloneRemote(_url: string, _slug: string): Promise<void> {
  throw new StoreError('SYNC_ERROR', 'GitHub sync not yet implemented — coming in Phase 5.')
}

/**
 * Push local store changes to the registered remote.
 */
export async function push(_slug: string): Promise<SyncPushResult> {
  throw new StoreError('SYNC_ERROR', 'GitHub sync not yet implemented — coming in Phase 5.')
}

/**
 * Pull remote changes into the local store.
 * Detects conflicts and returns them without corrupting local state.
 */
export async function pull(_slug: string): Promise<SyncPullResult> {
  throw new StoreError('SYNC_ERROR', 'GitHub sync not yet implemented — coming in Phase 5.')
}

/**
 * Pull then push (safe sync order).
 */
export async function sync(_slug: string): Promise<void> {
  throw new StoreError('SYNC_ERROR', 'GitHub sync not yet implemented — coming in Phase 5.')
}

/**
 * Return current sync status for the project.
 */
export async function status(_slug: string): Promise<SyncStatus> {
  throw new StoreError('SYNC_ERROR', 'GitHub sync not yet implemented — coming in Phase 5.')
}
