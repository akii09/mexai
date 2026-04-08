/**
 * mexai sync — GitHub sync commands (Phase 5 stubs).
 *
 * All subcommands are stubs that inform the user sync is coming in Phase 5.
 * Wires to the sync-manager module in @mexai/core.
 */

import {
  syncInitRemote,
  syncCloneRemote,
  syncPush,
  syncPull,
  sync,
  syncStatus,
} from '@mexai/core'
import { info, warn, blank, header } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface SyncOptions {
  slug?: string
  project?: string
  init?: boolean
  clone?: string
  push?: boolean
  pull?: boolean
  status?: boolean
  repoName?: string
  visibility?: 'public' | 'private'
}

export async function runSync(options: SyncOptions): Promise<void> {
  try {
    if (options.clone !== undefined) {
      // Clone doesn't need an existing project
      await syncCloneRemote(options.clone, options.slug ?? 'cloned-project')
      return
    }

    const entry = await resolveFromOptions(options)

    header(`mexai sync — ${entry.name}`)
    blank()

    if (options.init === true) {
      const repoName = options.repoName ?? entry.slug
      const visibility = options.visibility ?? 'private'
      await syncInitRemote(entry.slug, repoName, visibility)
      return
    }

    if (options.push === true) {
      await syncPush(entry.slug)
      return
    }

    if (options.pull === true) {
      await syncPull(entry.slug)
      return
    }

    if (options.status === true) {
      await syncStatus(entry.slug)
      return
    }

    // Default: pull then push
    await sync(entry.slug)
  } catch (err) {
    // Sync stubs throw a "not yet implemented" error — show a friendly message
    if (err instanceof Error && err.message.includes('Phase 5')) {
      warn('GitHub sync is not yet available — coming in Phase 5.')
      blank()
      info('Track progress: https://github.com/mexai/mexai')
    } else {
      handleError(err)
    }
  }
}
