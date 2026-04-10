/**
 * mexai edit — open a layer file in $EDITOR, or write it non-interactively.
 *
 * Usage:
 *   mexai edit                        — opens context.md in $EDITOR (default)
 *   mexai edit --layer codebase       — opens codebase.md in $EDITOR
 *   mexai edit --print-path           — prints the file path and exits (for scripting)
 *   mexai edit --from-file <path>     — writes content from <path> to the layer
 *   mexai edit --stdin                — reads content from stdin and writes to the layer
 *   mexai edit --json                 — output operation result as JSON (CI-safe)
 *
 * After any write, context.md is validated for frontmatter correctness.
 */

import * as path from 'node:path'
import * as os from 'node:os'
import * as fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import type { Layer } from '@mexai/core'
import { validateContextFrontmatter } from '@mexai/core'
import { info, warn, success, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface EditOptions {
  slug?: string
  project?: string
  layer?: string
  fromFile?: string
  stdin?: boolean
  printPath?: boolean
  json?: boolean
}

const VALID_LAYERS: Layer[] = ['context', 'codebase', 'rules']
const LAYER_FILES: Record<Layer, string> = {
  context: 'context.md',
  codebase: 'codebase.md',
  rules: 'rules.md',
}

export async function runEdit(options: EditOptions): Promise<void> {
  try {
    const entry = await resolveFromOptions(options)

    const layer: Layer = isValidLayer(options.layer) ? options.layer : 'context'
    const fileName = LAYER_FILES[layer]
    const filePath = path.join(os.homedir(), '.mexai', 'projects', entry.slug, fileName)

    // ── --print-path: just show the path and exit ───────────────────────────
    if (options.printPath === true) {
      if (options.json === true) {
        console.log(JSON.stringify({ slug: entry.slug, layer, filePath, action: 'path-printed' }))
      } else {
        console.log(filePath)
      }
      return
    }

    // ── --from-file: write content from a file ──────────────────────────────
    if (options.fromFile !== undefined) {
      if (!fs.existsSync(options.fromFile)) {
        if (options.json === true) {
          console.log(JSON.stringify({ slug: entry.slug, layer, filePath, action: 'write', success: false, error: `File not found: ${options.fromFile}` }))
          process.exitCode = 1
          return
        }
        warn(`File not found: ${options.fromFile}`)
        process.exitCode = 1
        return
      }
      const content = fs.readFileSync(options.fromFile, 'utf8')
      fs.writeFileSync(filePath, content, 'utf8')
      const { valid, errors } = checkValidation(layer, filePath)
      if (options.json === true) {
        console.log(JSON.stringify({ slug: entry.slug, layer, filePath, action: 'write', success: true, valid, validationErrors: errors }))
        return
      }
      blank()
      success(`Layer "${layer}" updated from ${options.fromFile}`)
      reportValidation(layer, valid, errors)
      return
    }

    // ── --stdin: read content from stdin ────────────────────────────────────
    if (options.stdin === true) {
      const chunks: Buffer[] = []
      for await (const chunk of process.stdin) {
        chunks.push(chunk as Buffer)
      }
      const content = Buffer.concat(chunks).toString('utf8')
      fs.writeFileSync(filePath, content, 'utf8')
      const { valid, errors } = checkValidation(layer, filePath)
      if (options.json === true) {
        console.log(JSON.stringify({ slug: entry.slug, layer, filePath, action: 'write', success: true, valid, validationErrors: errors }))
        return
      }
      blank()
      success(`Layer "${layer}" updated from stdin.`)
      reportValidation(layer, valid, errors)
      return
    }

    // ── JSON + no write flag: print path info ────────────────────────────────
    if (options.json === true) {
      const { valid, errors } = checkValidation(layer, filePath)
      console.log(JSON.stringify({ slug: entry.slug, layer, filePath, action: 'info', valid, validationErrors: errors }))
      return
    }

    // ── Interactive editor ───────────────────────────────────────────────────
    const editor = process.env.EDITOR ?? process.env.VISUAL ?? 'vi'

    header('mexai edit')
    blank()
    label('Layer', layer)
    label('File', filePath)
    label('Editor', editor)
    blank()

    const result = spawnSync(editor, [filePath], { stdio: 'inherit' })

    if (result.error !== undefined) {
      warn(`Could not open editor "${editor}". Set $EDITOR to your preferred editor.`)
      info(`  File path: ${filePath}`)
      info(`  To write non-interactively:  mexai edit --from-file <path>`)
      return
    }

    blank()
    const { valid, errors } = checkValidation(layer, filePath)
    reportValidation(layer, valid, errors)
    info(`Run  mexai status  to see the current state.`)
  } catch (err) {
    if (options.json === true) {
      console.log(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }))
      process.exitCode = 1
      return
    }
    handleError(err)
  }
}

function checkValidation(layer: Layer, filePath: string): { valid: boolean; errors: string | null } {
  if (layer !== 'context') return { valid: true, errors: null }
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const errMsg = validateContextFrontmatter(raw)
    return { valid: errMsg === null, errors: errMsg }
  } catch {
    return { valid: false, errors: 'File could not be read for validation.' }
  }
}

function reportValidation(layer: Layer, valid: boolean, errors: string | null): void {
  if (layer !== 'context') return
  if (!valid && errors !== null) {
    blank()
    warn('context.md has frontmatter issues (will be auto-repaired on next read):')
    console.log(errors)
    blank()
    info('Run  mexai doctor  to automatically fix these issues.')
  } else {
    success('context.md frontmatter is valid.')
  }
}

function isValidLayer(value: string | undefined): value is Layer {
  return value !== undefined && (VALID_LAYERS as string[]).includes(value)
}
