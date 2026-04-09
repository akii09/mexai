/**
 * Standalone MCP server binary.
 * Spawned by `mexai serve`. Communicates over stdio.
 * Do not import this file — use server.ts exports instead.
 */
import { startServer } from './server.js'

startServer({ debug: process.argv.includes('--debug') })
