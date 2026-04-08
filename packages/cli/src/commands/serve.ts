/**
 * mexai serve — start the MCP server.
 *
 * Spawns the @mexai/mcp server process. The MCP server handles tool calls
 * from AI editors over stdio using the Model Context Protocol.
 */

import { spawn } from 'node:child_process'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { info, warn, dim } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'

interface ServeOptions {
  debug?: boolean
}

export function runServe(options: ServeOptions): void {
  try {
    // Locate the MCP server binary relative to this CLI package
    const serverBin = findMcpServerBin()

    if (options.debug === true) {
      info(`Starting MCP server: ${serverBin}`)
    }

    // MCP servers communicate over stdio — just exec the server process
    // The calling editor (Cursor, Claude Code, etc.) manages the subprocess
    const child = spawn(process.execPath, [serverBin], {
      stdio: 'inherit',
      env: { ...process.env },
    })

    child.on('error', (err) => {
      warn(`MCP server error: ${err.message}`)
      process.exit(1)
    })

    child.on('exit', (code) => {
      process.exit(code ?? 0)
    })
  } catch (err) {
    handleError(err)
  }
}

function findMcpServerBin(): string {
  // Try @mexai/mcp package dist relative to node_modules
  const candidates = [
    // Installed as dependency
    path.resolve(
      path.dirname(process.execPath),
      '../lib/node_modules/@mexai/mcp/dist/server.cjs'
    ),
    // Monorepo development layout
    path.resolve(__dirname, '../../../mcp/dist/server.cjs'),
    // Sibling node_modules
    path.resolve(process.cwd(), 'node_modules/@mexai/mcp/dist/server.cjs'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  // Fall through — let the process fail with a meaningful error
  dim('Could not locate @mexai/mcp server binary.')
  dim('Ensure @mexai/mcp is installed: pnpm add @mexai/mcp')
  process.exit(1)
}
