/**
 * mexai connect — configure MCP server for your AI editor.
 *
 * Writes the MCP server config for the selected editor and exports
 * flat context files to the project root for editors that don't support MCP.
 *
 * Project root is ALWAYS the current working directory. If the stored
 * registry path differs, it is updated to the cwd (so running
 * `mexai connect` from the quality-lens directory will register and
 * write configs there, regardless of where `mexai init` was run from).
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import inquirer from 'inquirer'
import {
  exportAgentsMd,
  exportClaudeMd,
  exportCursorRules,
  linkPath,
  writeProjectLink,
} from '@mexai/core'
import { success, info, warn, blank, header, label } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'
import { resolveFromOptions } from '../utils/resolve.js'

type EditorTarget = 'cursor' | 'claude-code' | 'vscode' | 'opencode' | 'all'

interface ConnectOptions {
  slug?: string
  project?: string
  editor?: EditorTarget
  exportFiles?: boolean
}

interface ConnectAnswers {
  editor: EditorTarget
  exportFiles: boolean
}

/** MCP server config block written into editor config files. */
const MCP_SERVER_ENTRY = {
  command: 'mexai',
  args: ['serve'],
  env: {},
}

export async function runConnect(options: ConnectOptions): Promise<void> {
  try {
    const entry = await resolveFromOptions(options)

    // The project root is always the current working directory.
    // If init was run from a different (often broader) directory, we update
    // the registry path to the specific project directory the user is in now.
    const projectRoot = process.cwd()

    if (entry.path !== projectRoot) {
      linkPath(entry.slug, projectRoot)
      info(`Updated project path: ${entry.path} → ${projectRoot}`)
    }
    writeProjectLink(projectRoot, entry.slug)

    header('mexai connect')
    info(`Connecting project: ${entry.name}`)
    blank()

    let editor = options.editor
    let doExportFiles = options.exportFiles ?? false

    if (editor === undefined) {
      const answers = await inquirer.prompt<ConnectAnswers>([
        {
          type: 'list',
          name: 'editor',
          message: 'Which AI editor do you want to connect?',
          choices: [
            { name: 'Cursor', value: 'cursor' },
            { name: 'Claude Code', value: 'claude-code' },
            { name: 'VS Code (Copilot / Continue)', value: 'vscode' },
            { name: 'OpenCode', value: 'opencode' },
            { name: 'All of the above', value: 'all' },
          ],
        },
        {
          type: 'confirm',
          name: 'exportFiles',
          message: 'Also export flat files (AGENTS.md, CLAUDE.md, .cursorrules) to project root?',
          default: true,
        },
      ])
      editor = answers.editor
      doExportFiles = answers.exportFiles
    }

    if (editor === undefined) {
      handleError(new Error('No editor selected.'))
      return
    }

    blank()

    const targets = editor === 'all'
      ? (['cursor', 'claude-code', 'vscode', 'opencode'] as const)
      : [editor]

    for (const target of targets) {
      writeMcpConfig(target, projectRoot)
      success(`Configured MCP for ${target}`)
    }

    if (doExportFiles) {
      blank()
      info('Exporting flat context files…')

      const agentsMd = exportAgentsMd(entry.slug)
      const claudeMd = exportClaudeMd(entry.slug)
      const cursorRules = exportCursorRules(entry.slug)

      fs.writeFileSync(path.join(projectRoot, 'AGENTS.md'), agentsMd, 'utf8')
      fs.writeFileSync(path.join(projectRoot, 'CLAUDE.md'), claudeMd, 'utf8')
      fs.writeFileSync(path.join(projectRoot, '.cursorrules'), cursorRules, 'utf8')

      success('AGENTS.md written')
      success('CLAUDE.md written')
      success('.cursorrules written')
    }

    blank()
    label('Project', entry.name)
    label('Project root', projectRoot)
    blank()
    info('Run  mexai status  to verify the connection.')
    warn('Restart your AI editor for MCP changes to take effect.')
  } catch (err) {
    handleError(err)
  }
}

// ---------------------------------------------------------------------------
// MCP config writers per editor
// ---------------------------------------------------------------------------

function writeMcpConfig(editor: 'cursor' | 'claude-code' | 'vscode' | 'opencode', projectRoot: string): void {
  switch (editor) {
    case 'cursor':
      writeCursorConfig(projectRoot)
      break
    case 'claude-code':
      writeClaudeCodeConfig(projectRoot)
      break
    case 'vscode':
      writeVscodeConfig(projectRoot)
      break
    case 'opencode':
      writeOpencodeConfig(projectRoot)
      break
  }
}

/** Cursor: .cursor/mcp.json in the project root. */
function writeCursorConfig(projectRoot: string): void {
  const cursorDir = path.join(projectRoot, '.cursor')
  const configPath = path.join(cursorDir, 'mcp.json')
  fs.mkdirSync(cursorDir, { recursive: true })
  const existing = readJsonSafe(configPath) ?? {}
  const servers = (existing.mcpServers as Record<string, unknown> | undefined) ?? {}
  servers.mexai = MCP_SERVER_ENTRY
  existing.mcpServers = servers
  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n', 'utf8')
}

/** Claude Code: ~/.claude/settings.json global MCP config. */
function writeClaudeCodeConfig(_projectRoot: string): void {
  const claudeDir = path.join(os.homedir(), '.claude')
  const configPath = path.join(claudeDir, 'settings.json')
  fs.mkdirSync(claudeDir, { recursive: true })
  const existing = readJsonSafe(configPath) ?? {}
  const servers = (existing.mcpServers as Record<string, unknown> | undefined) ?? {}
  servers.mexai = MCP_SERVER_ENTRY
  existing.mcpServers = servers
  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n', 'utf8')
}

/** VS Code: .vscode/mcp.json in the project root. */
function writeVscodeConfig(projectRoot: string): void {
  const vscodeDir = path.join(projectRoot, '.vscode')
  const configPath = path.join(vscodeDir, 'mcp.json')
  fs.mkdirSync(vscodeDir, { recursive: true })
  const existing = readJsonSafe(configPath) ?? {}
  const servers = (existing.servers as Record<string, unknown> | undefined) ?? {}
  servers.mexai = MCP_SERVER_ENTRY
  existing.servers = servers
  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n', 'utf8')
}

/** OpenCode: ~/.config/opencode/config.json. */
function writeOpencodeConfig(_projectRoot: string): void {
  const configDir = path.join(os.homedir(), '.config', 'opencode')
  const configPath = path.join(configDir, 'config.json')
  fs.mkdirSync(configDir, { recursive: true })
  const existing = readJsonSafe(configPath) ?? {}
  const servers = (existing.mcpServers as Record<string, unknown> | undefined) ?? {}
  servers.mexai = MCP_SERVER_ENTRY
  existing.mcpServers = servers
  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n', 'utf8')
}

function readJsonSafe(filePath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}
