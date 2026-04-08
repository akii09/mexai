/**
 * mexai CLI — entry point.
 *
 * All commands registered here. Business logic lives in @mexai/core.
 * This file is a thin adapter: parse args → call command → exit.
 */

import { Command } from 'commander'
import { runInit } from './commands/init.js'
import { runMap } from './commands/map.js'
import { runConnect } from './commands/connect.js'
import { runDiff } from './commands/diff.js'
import { runCommit } from './commands/commit.js'
import { runLink } from './commands/link.js'
import { runLoad } from './commands/load.js'
import { runList } from './commands/list.js'
import { runStatus } from './commands/status.js'
import { runLog } from './commands/log.js'
import { runRestore } from './commands/restore.js'
import { runEdit } from './commands/edit.js'
import { runExport } from './commands/export.js'
import { runSync } from './commands/sync.js'
import { runServe } from './commands/serve.js'

const program = new Command()

program
  .name('mexai')
  .description('Local-first AI context manager')
  .version('0.1.0')

// ---------------------------------------------------------------------------
// mexai init
// ---------------------------------------------------------------------------

program
  .command('init')
  .description('Initialise a new project context store')
  .option('--slug <slug>', 'Override the auto-generated slug')
  .action((options: { slug?: string }) => {
    void runInit(options)
  })

// ---------------------------------------------------------------------------
// mexai map
// ---------------------------------------------------------------------------

program
  .command('map')
  .description('Scan the codebase and generate/update codebase.md')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .action((options: { project?: string }) => {
    void runMap(options)
  })

// ---------------------------------------------------------------------------
// mexai connect
// ---------------------------------------------------------------------------

program
  .command('connect')
  .description('Configure MCP for your AI editor')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('--editor <editor>', 'Editor to configure: cursor | claude-code | vscode | opencode | all')
  .option('--export-files', 'Also export flat files (AGENTS.md, CLAUDE.md, .cursorrules)')
  .action((options: { project?: string; editor?: string; exportFiles?: boolean }) => {
    void runConnect(options as Parameters<typeof runConnect>[0])
  })

// ---------------------------------------------------------------------------
// mexai diff
// ---------------------------------------------------------------------------

program
  .command('diff')
  .description('Show the pending diff for the active project')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('--discard', 'Discard the pending diff without applying')
  .action((options: { project?: string; discard?: boolean }) => {
    runDiff(options)
  })

// ---------------------------------------------------------------------------
// mexai commit
// ---------------------------------------------------------------------------

program
  .command('commit')
  .description('Apply the pending diff and commit to the store')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .action((options: { project?: string }) => {
    void runCommit(options)
  })

// ---------------------------------------------------------------------------
// mexai link
// ---------------------------------------------------------------------------

program
  .command('link <slug>')
  .description('Register a codebase path for an existing project')
  .option('--path <path>', 'Path to register (defaults to cwd)')
  .action((slug: string, options: { path?: string }) => {
    runLink(slug, options)
  })

// ---------------------------------------------------------------------------
// mexai load
// ---------------------------------------------------------------------------

program
  .command('load <slug>')
  .description('Set the active project')
  .action((slug: string) => {
    runLoad(slug)
  })

// ---------------------------------------------------------------------------
// mexai list
// ---------------------------------------------------------------------------

program
  .command('list')
  .alias('ls')
  .description('List all projects')
  .action(() => {
    runList()
  })

// ---------------------------------------------------------------------------
// mexai status
// ---------------------------------------------------------------------------

program
  .command('status')
  .description('Show the current status of the active project')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .action((options: { project?: string }) => {
    void runStatus(options)
  })

// ---------------------------------------------------------------------------
// mexai log
// ---------------------------------------------------------------------------

program
  .command('log')
  .description('Show git history for the project store')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('-n <count>', 'Number of log entries to show (default: 10)')
  .action((options: { project?: string; n?: string }) => {
    void runLog(options)
  })

// ---------------------------------------------------------------------------
// mexai restore
// ---------------------------------------------------------------------------

program
  .command('restore <hash>')
  .description('Restore the project store to a specific git commit')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action((hash: string, options: { project?: string; yes?: boolean }) => {
    void runRestore(hash, options)
  })

// ---------------------------------------------------------------------------
// mexai edit
// ---------------------------------------------------------------------------

program
  .command('edit')
  .description('Open a layer file in $EDITOR')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('--layer <layer>', 'Layer to edit: context | codebase | rules (default: context)')
  .action((options: { project?: string; layer?: string }) => {
    runEdit(options)
  })

// ---------------------------------------------------------------------------
// mexai export
// ---------------------------------------------------------------------------

program
  .command('export')
  .description('Export flat context files (AGENTS.md, CLAUDE.md, .cursorrules) to the project root')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('--dir <path>', 'Output directory (defaults to project path)')
  .action((options: { project?: string; dir?: string }) => {
    runExport(options)
  })

// ---------------------------------------------------------------------------
// mexai sync
// ---------------------------------------------------------------------------

const syncCmd = program
  .command('sync')
  .description('Sync the project store with GitHub (Phase 5)')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('--push', 'Push local changes to remote')
  .option('--pull', 'Pull remote changes to local')
  .option('--status', 'Show sync status')
  .action((options: { project?: string; push?: boolean; pull?: boolean; status?: boolean }) => {
    void runSync(options)
  })

syncCmd
  .command('init [repoName]')
  .description('Initialise a GitHub remote for this project')
  .option('--public', 'Create a public repository (default: private)')
  .action((repoName: string | undefined, options: { public?: boolean }) => {
    void runSync({
      init: true,
      ...(repoName !== undefined ? { repoName } : {}),
      visibility: options.public === true ? 'public' : 'private',
    })
  })

syncCmd
  .command('clone <url>')
  .description('Clone a remote project store')
  .option('--slug <slug>', 'Local slug for the cloned project')
  .action((url: string, options: { slug?: string }) => {
    void runSync({
      clone: url,
      ...(options.slug !== undefined ? { slug: options.slug } : {}),
    })
  })

// ---------------------------------------------------------------------------
// mexai serve
// ---------------------------------------------------------------------------

program
  .command('serve')
  .description('Start the MCP server (used by AI editors)')
  .option('--debug', 'Enable debug output')
  .action((options: { debug?: boolean }) => {
    runServe(options)
  })

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

program.parse(process.argv)
