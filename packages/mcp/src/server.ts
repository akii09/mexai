/**
 * MCP server — wires all tools.
 * Thin adapter over @mexai/core. No business logic here.
 *
 * Design note: mexai exposes context via Tools only (context_read,
 * context_save, codebase_read, rules_read, context_list). MCP Resources
 * are intentionally omitted — they require a stable URI scheme and domain
 * that doesn't add value over the tools. Use context_read instead.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { ContextSourceSchema, LayerSchema } from '@mexai/core'
import type { McpToolResult } from '@mexai/core'
import { handleContextRead } from './tools/context-read.js'
import { handleContextSave } from './tools/context-save.js'
import { handleCodebaseRead } from './tools/codebase-read.js'
import { handleRulesRead } from './tools/rules-read.js'
import { handleContextList } from './tools/context-list.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert McpToolResult to MCP SDK response format. */
function toCallResult(result: McpToolResult) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    isError: !result.success,
  }
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export function createServer(): McpServer {
  const server = new McpServer({ name: 'mexai', version: '0.1.0' })

  // ── context_read ──────────────────────────────────────────────────────────
  server.registerTool('context_read', {
    title: 'Read Project Context',
    description: 'Read the project context, codebase map, and agent rules. Returns the full injection payload for the active project.',
    inputSchema: {
      workspacePath: z.string().optional().describe('Absolute path to the project workspace — auto-detects project via registry'),
      slug: z.string().optional().describe('Project slug. Takes priority over workspacePath.'),
      layers: z.array(LayerSchema).optional().describe('Which layers to include (context, codebase, rules). Defaults to all three.'),
      maxTokens: z.number().int().positive().optional().describe('Override the token ceiling from config.'),
    },
  }, ({ workspacePath, slug, layers, maxTokens }) => {
    return toCallResult(handleContextRead({ workspacePath, slug, layers, maxTokens }))
  })

  // ── context_save ─────────────────────────────────────────────────────────
  server.registerTool('context_save', {
    title: 'Save Context Changes',
    description: 'Stage proposed context updates for developer review. Changes are written to pending-diff.json. The developer runs `mexai diff` to review and `mexai commit` to apply. Multiple saves before a commit are automatically merged.',
    inputSchema: {
      workspacePath: z.string().optional().describe('Absolute path to the project workspace'),
      slug: z.string().optional().describe('Project slug. Takes priority over workspacePath.'),
      source: ContextSourceSchema.describe('Which AI tool is making this save'),
      commitMessage: z.string().min(1).max(72).describe('Short commit message summarising the changes (max 72 chars)'),
      sessionNote: z.string().optional().describe('Optional note about what happened in this session'),
      changes: z.object({
        decisions: z.array(z.object({
          title: z.string().min(1).describe('Short decision title'),
          rationale: z.string().min(1).describe('Why this decision was made'),
          date: z.string().optional().describe('ISO date (YYYY-MM-DD). Defaults to today.'),
        })).optional().describe('Architectural or design decisions to record'),
        openThreads: z.array(z.object({
          action: z.enum(['add', 'check_off']).describe('"add" to create a new thread, "check_off" to resolve an existing one'),
          content: z.string().min(1).describe('The thread content'),
        })).optional().describe('Open threads (work items, questions) to add or resolve'),
        currentState: z.string().optional().describe('A fresh description of the current development state'),
      }).describe('The proposed context changes. At least one field must be provided.'),
      dryRun: z.boolean().optional().describe('If true, build and return the diff preview without writing to pending-diff. Useful for inspecting what would change.'),
    },
  }, ({ workspacePath, slug, source, commitMessage, sessionNote, changes, dryRun }) => {
    return toCallResult(handleContextSave({ workspacePath, slug, source, commitMessage, sessionNote, changes, dryRun }))
  })

  // ── codebase_read ─────────────────────────────────────────────────────────
  server.registerTool('codebase_read', {
    title: 'Read Codebase Map',
    description: 'Read the codebase map (structure, key files, conventions, patterns). Returns the full codebase.md or a specific section.',
    inputSchema: {
      workspacePath: z.string().optional(),
      slug: z.string().optional(),
      section: z.enum(['all', 'structure', 'keyFiles', 'conventions', 'patterns', 'doNotTouch']).default('all').describe('Which section to return. Defaults to "all".'),
    },
  }, ({ workspacePath, slug, section }) => {
    return toCallResult(handleCodebaseRead({ workspacePath, slug, section }))
  })

  // ── rules_read ────────────────────────────────────────────────────────────
  server.registerTool('rules_read', {
    title: 'Read Agent Rules',
    description: 'Read the agent rules (code quality gates, security rules, consistency requirements). Never truncated.',
    inputSchema: {
      workspacePath: z.string().optional(),
      slug: z.string().optional(),
    },
  }, ({ workspacePath, slug }) => {
    return toCallResult(handleRulesRead({ workspacePath, slug }))
  })

  // ── context_list ──────────────────────────────────────────────────────────
  server.registerTool('context_list', {
    title: 'List Projects',
    description: 'List all projects in the mexai store. Shows name, slug, path, status, and which is currently active.',
    inputSchema: {},
  }, () => {
    return toCallResult(handleContextList())
  })

  return server
}

// ---------------------------------------------------------------------------
// startServer — wired to `mexai serve`
// ---------------------------------------------------------------------------

export function startServer(opts: { debug?: boolean | undefined } = {}): void {
  if (opts.debug === true) {
    process.stderr.write('[mexai] MCP server starting...\n')
  }

  const server = createServer()
  const transport = new StdioServerTransport()

  void server.connect(transport).then(() => {
    if (opts.debug === true) {
      process.stderr.write('[mexai] MCP server connected and listening.\n')
    }
  }).catch((err: unknown) => {
    process.stderr.write(`[mexai] MCP server error: ${String(err)}\n`)
    process.exit(1)
  })

  const shutdown = (): void => {
    void server.close().then(() => process.exit(0))
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
