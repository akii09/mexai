/**
 * StoreManager — the single module that touches ~/.mexai/.
 * No other module may read or write to the store directory.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type {
  Layer,
  MexaiRegistry,
  PendingDiff,
  ProjectSummary,
  RegistryEntry,
} from '../types.js'
import { StoreError } from '../types.js'
import { PendingDiffSchema } from '../schemas.js'
import {
  readRegistry,
  writeRegistry,
  findBySlug,
  findByWorkspacePath,
  slugify,
  ensureUniqueSlug,
} from './registry.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORE_DIR = path.join(os.homedir(), '.mexai')
const PROJECTS_DIR = path.join(STORE_DIR, 'projects')
const REGISTRY_PATH = path.join(STORE_DIR, 'registry.json')
const CONFIG_PATH = path.join(STORE_DIR, 'config.json')
const ACTIVE_PATH = path.join(STORE_DIR, 'active')

const LAYER_FILE: Record<Layer, string> = {
  context: 'context.md',
  codebase: 'codebase.md',
  rules: 'rules.md',
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

/**
 * Ensure the store directory structure exists.
 * Creates ~/.mexai/, projects/, config.json, and registry.json if missing.
 * Safe to call multiple times (idempotent).
 */
export function ensureStore(): void {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true })

  if (!fs.existsSync(REGISTRY_PATH)) {
    const empty: MexaiRegistry = { version: 1, entries: [] }
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(empty, null, 2) + '\n', 'utf8')
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      version: 1,
      tokenBudget: { context: 250, codebase: 300, rules: 150, total: 700 },
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2) + '\n', 'utf8')
  }
}

// ---------------------------------------------------------------------------
// Project lifecycle
// ---------------------------------------------------------------------------

export interface InitProjectOptions {
  name: string
  domain: string
  stack: string[]
  identity: string
  currentState: string
  codebasePath: string  // absolute path to the user's codebase root
}

/**
 * Create a new project in the store.
 * Writes layer files with starter content, registers the codebase path.
 * Returns the project slug.
 */
export function initProject(opts: InitProjectOptions): string {
  ensureStore()

  const registry = readRegistry(STORE_DIR)
  const base = slugify(opts.name)
  const slug = ensureUniqueSlug(registry, base)

  const projectDir = path.join(PROJECTS_DIR, slug)
  fs.mkdirSync(projectDir, { recursive: true })

  const now = new Date().toISOString()

  // Layer 1 — context.md
  const contextContent = buildStarterContext({
    slug,
    name: opts.name,
    domain: opts.domain,
    stack: opts.stack,
    identity: opts.identity,
    currentState: opts.currentState,
    now,
  })
  fs.writeFileSync(path.join(projectDir, 'context.md'), contextContent, 'utf8')

  // Layer 2 — codebase.md (empty stub)
  fs.writeFileSync(path.join(projectDir, 'codebase.md'), STARTER_CODEBASE, 'utf8')

  // Layer 3 — rules.md (starter template)
  fs.writeFileSync(path.join(projectDir, 'rules.md'), STARTER_RULES, 'utf8')

  // Register path
  const entry: RegistryEntry = {
    slug,
    name: opts.name,
    path: opts.codebasePath,
    createdAt: now,
    updatedAt: now,
  }
  registry.entries.push(entry)
  writeRegistry(STORE_DIR, registry)

  // Set as active
  setActive(slug)

  return slug
}

// ---------------------------------------------------------------------------
// Resolution chain
// ---------------------------------------------------------------------------

/**
 * Resolve which project is active for a given context.
 *
 * Resolution order:
 * 1. Explicit slug (if provided)
 * 2. workspacePath prefix match against registry
 * 3. Active fallback (~/.mexai/active)
 * 4. Throws NO_ACTIVE_PROJECT
 */
export function resolveProject(opts: {
  slug?: string
  workspacePath?: string
}): RegistryEntry {
  ensureStore()
  const registry = readRegistry(STORE_DIR)

  // 1. Explicit slug
  if (opts.slug !== undefined) {
    const entry = findBySlug(registry, opts.slug)
    if (entry === undefined) {
      throw new StoreError('PROJECT_NOT_FOUND', `No project found with slug "${opts.slug}". Run \`mexai list\` to see all projects.`)
    }
    return entry
  }

  // 2. Workspace path prefix match
  if (opts.workspacePath !== undefined) {
    const entry = findByWorkspacePath(registry, opts.workspacePath)
    if (entry !== undefined) return entry
  }

  // 3. Active fallback
  const activeSlug = getActive()
  if (activeSlug !== undefined) {
    const entry = findBySlug(registry, activeSlug)
    if (entry !== undefined) return entry
  }

  // 4. No project found
  throw new StoreError(
    'NO_ACTIVE_PROJECT',
    'No active project found. Run `mexai init` to create one, or `mexai load <slug>` to activate an existing project.'
  )
}

// ---------------------------------------------------------------------------
// Active project
// ---------------------------------------------------------------------------

/** Return the slug of the active project, or undefined if none is set. */
export function getActive(): string | undefined {
  if (!fs.existsSync(ACTIVE_PATH)) return undefined
  const content = fs.readFileSync(ACTIVE_PATH, 'utf8').trim()
  return content.length > 0 ? content : undefined
}

/** Set the active project slug. */
export function setActive(slug: string): void {
  ensureStore()
  fs.writeFileSync(ACTIVE_PATH, slug + '\n', 'utf8')
}

// ---------------------------------------------------------------------------
// Layer CRUD
// ---------------------------------------------------------------------------

/**
 * Read a layer file for the given slug.
 * Throws LAYER_NOT_INITIALIZED if the file does not exist or is empty.
 */
export function readLayer(slug: string, layer: Layer): string {
  const filePath = layerPath(slug, layer)
  if (!fs.existsSync(filePath)) {
    throw new StoreError(
      'LAYER_NOT_INITIALIZED',
      `Layer "${layer}" is not initialized for project "${slug}". Run \`mexai map\` to generate the codebase layer, or \`mexai edit --layer ${layer}\` to create it.`
    )
  }
  const content = fs.readFileSync(filePath, 'utf8')
  if (content.trim().length === 0) {
    throw new StoreError(
      'LAYER_NOT_INITIALIZED',
      `Layer "${layer}" exists but is empty for project "${slug}". Run \`mexai edit --layer ${layer}\` to populate it.`
    )
  }
  return content
}

/**
 * Write a layer file for the given slug.
 */
export function writeLayer(slug: string, layer: Layer, content: string): void {
  ensureProjectDir(slug)
  fs.writeFileSync(layerPath(slug, layer), content, 'utf8')

  // Update registry updatedAt
  const registry = readRegistry(STORE_DIR)
  const entry = findBySlug(registry, slug)
  if (entry !== undefined) {
    entry.updatedAt = new Date().toISOString()
    writeRegistry(STORE_DIR, registry)
  }
}

// ---------------------------------------------------------------------------
// Pending diff CRUD
// ---------------------------------------------------------------------------

/** Read pending-diff.json. Returns undefined if none exists. */
export function readPendingDiff(slug: string): PendingDiff | undefined {
  const diffPath = pendingDiffPath(slug)
  if (!fs.existsSync(diffPath)) return undefined

  const raw = fs.readFileSync(diffPath, 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    throw new StoreError('STORE_ERROR', `pending-diff.json is corrupt for project "${slug}". Delete it with \`mexai diff --discard\`.`)
  }

  const result = PendingDiffSchema.safeParse(parsed)
  if (!result.success) {
    throw new StoreError('STORE_ERROR', `pending-diff.json has invalid structure for project "${slug}": ${result.error.message}`)
  }

  return result.data
}

/** Write pending-diff.json. */
export function writePendingDiff(slug: string, diff: PendingDiff): void {
  ensureProjectDir(slug)
  fs.writeFileSync(pendingDiffPath(slug), JSON.stringify(diff, null, 2) + '\n', 'utf8')
}

/** Delete pending-diff.json. No-op if it doesn't exist. */
export function clearPendingDiff(slug: string): void {
  const diffPath = pendingDiffPath(slug)
  if (fs.existsSync(diffPath)) {
    fs.rmSync(diffPath)
  }
}

// ---------------------------------------------------------------------------
// Project list
// ---------------------------------------------------------------------------

/** List all projects as ProjectSummary[]. */
export function listProjects(): ProjectSummary[] {
  ensureStore()
  const registry = readRegistry(STORE_DIR)

  return registry.entries.map((entry): ProjectSummary => {
    const hasPendingDiff = fs.existsSync(pendingDiffPath(entry.slug))
    return {
      slug: entry.slug,
      name: entry.name,
      path: entry.path,
      status: 'active',
      updatedAt: entry.updatedAt,
      hasPendingDiff,
      remote: entry.remote,
    }
  })
}

// ---------------------------------------------------------------------------
// Project store path
// ---------------------------------------------------------------------------

/**
 * Return the absolute path to a project's directory inside the store.
 * Used by git operations that need the filesystem path.
 */
export function projectStorePath(slug: string): string {
  return path.join(PROJECTS_DIR, slug)
}

// ---------------------------------------------------------------------------
// Path registration
// ---------------------------------------------------------------------------

/**
 * Register a codebase path for an existing project slug.
 * Used by `mexai link`.
 */
export function linkPath(slug: string, codebasePath: string): void {
  ensureStore()
  const registry = readRegistry(STORE_DIR)
  const entry = findBySlug(registry, slug)
  if (entry === undefined) {
    throw new StoreError('PROJECT_NOT_FOUND', `No project found with slug "${slug}".`)
  }
  entry.path = codebasePath
  entry.updatedAt = new Date().toISOString()
  writeRegistry(STORE_DIR, registry)
}

/**
 * Update the remote URL for a project.
 */
export function setRemote(slug: string, remoteUrl: string): void {
  ensureStore()
  const registry = readRegistry(STORE_DIR)
  const entry = findBySlug(registry, slug)
  if (entry === undefined) {
    throw new StoreError('PROJECT_NOT_FOUND', `No project found with slug "${slug}".`)
  }
  entry.remote = remoteUrl
  entry.updatedAt = new Date().toISOString()
  writeRegistry(STORE_DIR, registry)
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function layerPath(slug: string, layer: Layer): string {
  return path.join(PROJECTS_DIR, slug, LAYER_FILE[layer])
}

function pendingDiffPath(slug: string): string {
  return path.join(PROJECTS_DIR, slug, 'pending-diff.json')
}

function ensureProjectDir(slug: string): void {
  fs.mkdirSync(path.join(PROJECTS_DIR, slug), { recursive: true })
}

function buildStarterContext(opts: {
  slug: string
  name: string
  domain: string
  stack: string[]
  identity: string
  currentState: string
  now: string
}): string {
  return `---
name: ${opts.name}
slug: ${opts.slug}
domain: ${opts.domain}
stack: [${opts.stack.map((s) => `"${s}"`).join(', ')}]
status: active
createdAt: "${opts.now}"
updatedAt: "${opts.now}"
---

## Identity

${opts.identity}

## Current State

${opts.currentState}

## Decisions

<!-- Architectural decisions will appear here. Use \`mexai commit\` to apply AI-proposed decisions. -->

## Open Threads

<!-- Open work items and questions will appear here. -->
`
}

const STARTER_CODEBASE = `# Codebase Map

<!-- Run \`mexai map\` to generate this from your repository. -->

## Structure

<!-- Directory tree will appear here after \`mexai map\`. -->

## Key Files

<!-- Key files and their purposes will appear here. -->

## Conventions

<!-- Code conventions and patterns will appear here. -->

## Patterns

<!-- Common implementation patterns will appear here. -->

## Do Not Touch

<!-- Files or directories that should never be modified will appear here. -->
`

const STARTER_RULES = `# Agent Rules

## Code Quality

- Follow existing code style — match the patterns already in the codebase
- Write tests for all new functionality
- Keep functions small and focused

## Security

- Never log secrets, tokens, or sensitive user data
- Validate all external input before use
- No eval, no dynamic require

## Consistency

- Match naming conventions already in use
- Use the same error handling patterns as surrounding code
- Follow the import order established in the file

## Review Gates

- All tests pass before suggesting a commit
- No new lint warnings
- No TypeScript errors
`
