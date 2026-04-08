/**
 * mexai edit — open a layer file in $EDITOR for direct editing.
 *
 * Usage:
 *   mexai edit                    — opens context.md (default)
 *   mexai edit --layer codebase   — opens codebase.md
 *   mexai edit --layer rules      — opens rules.md
 */

import * as path from 'node:path'
import * as os from 'node:os'
import { spawnSync } from 'node:child_process'
import type { Layer } from '@mexai/core'
import { info, warn, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

interface EditOptions {
  slug?: string
  project?: string
  layer?: string
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
      info(`File path: ${filePath}`)
      return
    }

    blank()
    info(`Saved. Run  mexai status  to see the current state.`)
  } catch (err) {
    handleError(err)
  }
}

function isValidLayer(value: string | undefined): value is Layer {
  return value !== undefined && (VALID_LAYERS as string[]).includes(value)
}
