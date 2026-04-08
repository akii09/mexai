import { readLayer, parseCodebase, StoreError } from '@mexai/core'
import type { McpToolResult, ParsedCodebase } from '@mexai/core'
import { resolveMcpProject } from '../utils/resolve.js'

export type CodebaseSection = 'all' | 'structure' | 'keyFiles' | 'conventions' | 'patterns' | 'doNotTouch'

export interface CodebaseReadInput {
  workspacePath?: string | undefined
  slug?: string | undefined
  section?: CodebaseSection | undefined
}

export function handleCodebaseRead(input: CodebaseReadInput): McpToolResult {
  try {
    const entry = resolveMcpProject(input.workspacePath, input.slug)
    const raw = readLayer(entry.slug, 'codebase')
    const section: CodebaseSection = input.section ?? 'all'

    let content: string
    if (section === 'all') {
      content = raw
    } else {
      const parsed: ParsedCodebase = parseCodebase(raw)
      content = parsed[section]
    }

    return {
      success: true,
      data: { projectSlug: entry.slug, section, content },
    }
  } catch (err) {
    if (err instanceof StoreError) return { success: false, error: err.code, message: err.message }
    return { success: false, error: 'STORE_ERROR', message: err instanceof Error ? err.message : String(err) }
  }
}
