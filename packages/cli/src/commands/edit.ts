/**
 * mexai edit — open a layer file in $EDITOR, or write it non-interactively.
 *
 * Usage:
 *   mexai edit                        — opens context.md in $EDITOR (default)
 *   mexai edit --layer codebase       — opens codebase.md in $EDITOR
 *   mexai edit --print-path           — prints the file path and exits (for scripting)
 *   mexai edit --from-file <path>     — writes content from <path> to the layer
 *   mexai edit --stdin                — reads content from stdin and writes to the layer
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
      console.log(filePath)
      return
    }

    // ── --from-file: write content from a file ──────────────────────────────
    if (options.fromFile !== undefined) {
      if (!fs.existsSync(options.fromFile)) {
        warn(`File not found: ${options.fromFile}`)
        process.exitCode = 1
        return
      }
      const content = fs.readFileSync(options.fromFile, 'utf8')
      fs.writeFileSync(filePath, content, 'utf8')
      blank()
      success(`Layer "${layer}" updated from ${options.fromFile}`)
      validateAndReport(layer, filePath)
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
      blank()
      success(`Layer "${layer}" updated from stdin.`)
      validateAndReport(layer, filePath)
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
    validateAndReport(layer, filePath)
    info(`Run  mexai status  to see the current state.`)
  } catch (err) {
    handleError(err)
  }
}

/**
 * Validate a layer file after write. Reports errors for context layer only
 * (codebase and rules are free-form markdown, no strict schema).
 */
function validateAndReport(layer: Layer, filePath: string): void {
  if (layer !== 'context') return
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const errMsg = validateContextFrontmatter(raw)
    if (errMsg !== null) {
      blank()
      warn('context.md has frontmatter issues (will be auto-repaired on next read):')
      console.log(errMsg)
      blank()
      info('Run  mexai doctor  to automatically fix these issues.')
    } else {
      success('context.md frontmatter is valid.')
    }
  } catch {
    // File unreadable — skip validation silently
  }
}

function isValidLayer(value: string | undefined): value is Layer {
  return value !== undefined && (VALID_LAYERS as string[]).includes(value)
}
