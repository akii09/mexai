/**
 * Registry utilities — project slug ↔ codebase path mapping.
 * StoreManager owns all I/O; this module provides pure helpers.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { MexaiRegistry, RegistryEntry } from '../types.js'
import { MexaiRegistrySchema } from '../schemas.js'
import { StoreError } from '../types.js'

/**
 * Read and validate registry.json from the given store root.
 * Returns an empty registry if the file does not exist.
 */
export function readRegistry(storeRoot: string): MexaiRegistry {
  const registryPath = path.join(storeRoot, 'registry.json')

  if (!fs.existsSync(registryPath)) {
    return { version: 1, entries: [] }
  }

  const raw = fs.readFileSync(registryPath, 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    throw new StoreError('STORE_ERROR', `registry.json is not valid JSON at ${registryPath}`)
  }

  const result = MexaiRegistrySchema.safeParse(parsed)
  if (!result.success) {
    throw new StoreError('STORE_ERROR', `registry.json has invalid structure: ${result.error.message}`)
  }

  return result.data
}

/**
 * Write registry.json to disk (pretty-printed).
 */
export function writeRegistry(storeRoot: string, registry: MexaiRegistry): void {
  const registryPath = path.join(storeRoot, 'registry.json')
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n', 'utf8')
}

/**
 * Find a registry entry by slug.
 */
export function findBySlug(registry: MexaiRegistry, slug: string): RegistryEntry | undefined {
  return registry.entries.find((e) => e.slug === slug)
}

/**
 * Find a registry entry whose registered path is a prefix of the given workspace path.
 * Uses fs.realpathSync to resolve symlinks before comparing.
 */
export function findByWorkspacePath(
  registry: MexaiRegistry,
  workspacePath: string
): RegistryEntry | undefined {
  let realWorkspace: string
  try {
    realWorkspace = fs.realpathSync(workspacePath)
  } catch {
    realWorkspace = workspacePath
  }

  return registry.entries.find((entry) => {
    let realEntry: string
    try {
      realEntry = fs.realpathSync(entry.path)
    } catch {
      realEntry = entry.path
    }
    return realWorkspace === realEntry || realWorkspace.startsWith(realEntry + path.sep)
  })
}

/**
 * Generate a URL-safe slug from a project name.
 * e.g. "My Cool Project" → "my-cool-project"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Ensure the slug is unique within the registry, appending a numeric suffix if needed.
 * e.g. "my-project" → "my-project-2" if "my-project" already exists.
 */
export function ensureUniqueSlug(registry: MexaiRegistry, base: string): string {
  const existing = new Set(registry.entries.map((e) => e.slug))
  if (!existing.has(base)) return base

  let counter = 2
  while (existing.has(`${base}-${counter}`)) {
    counter++
  }
  return `${base}-${counter}`
}
