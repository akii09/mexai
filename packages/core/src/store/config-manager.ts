/**
 * ConfigManager — reads and writes ~/.mexai/config.json.
 * Only called through StoreManager conventions — not directly from cli/mcp.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { MexaiConfig, TokenBudgetConfig } from '../types.js'
import { MexaiConfigSchema } from '../schemas.js'
import { StoreError } from '../types.js'

const CONFIG_PATH = path.join(os.homedir(), '.mexai', 'config.json')

const DEFAULT_CONFIG: MexaiConfig = {
  version: 1,
  tokenBudget: {
    context: 250,
    codebase: 300,
    rules: 150,
    total: 700,
  },
}

/**
 * Read config.json, merging with defaults for any missing fields.
 * Returns defaults if the file does not exist.
 */
export function readConfig(): MexaiConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG }
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    throw new StoreError('STORE_ERROR', `config.json is not valid JSON at ${CONFIG_PATH}`)
  }

  const result = MexaiConfigSchema.safeParse(parsed)
  if (!result.success) {
    // Config is partially invalid — return defaults rather than crashing
    return { ...DEFAULT_CONFIG }
  }

  // Deep merge: apply defaults for any missing token budget fields
  return {
    ...DEFAULT_CONFIG,
    ...result.data,
    tokenBudget: {
      ...DEFAULT_CONFIG.tokenBudget,
      ...result.data.tokenBudget,
    },
  }
}

/**
 * Write config.json to disk.
 */
export function writeConfig(config: MexaiConfig): void {
  const dir = path.dirname(CONFIG_PATH)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8')
}

/**
 * Return the token budget, with all defaults applied.
 */
export function getTokenBudget(): TokenBudgetConfig {
  const config = readConfig()
  return {
    ...DEFAULT_CONFIG.tokenBudget,
    ...config.tokenBudget,
  }
}
