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
import { runContextSave } from './commands/context-save.js'
import { runValidate } from './commands/validate.js'
import { runDoctor } from './commands/doctor.js'
import { runApply } from './commands/apply.js'

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
  .option('-y, --yes', 'Non-interactive mode: accept all defaults (CI-safe). Combine with --name, --domain, --stack, --identity, --current-state to override defaults.')
  .option('--name <name>', 'Project name (used with --yes)')
  .option('--domain <domain>', 'Project domain (used with --yes, default: web-app)')
  .option('--stack <stack>', 'Comma-separated stack (used with --yes, default: TypeScript)')
  .option('--identity <text>', 'One-line project description (used with --yes)')
  .option('--current-state <text>', 'Current development state (used with --yes)')
  .action((options: { slug?: string; yes?: boolean; name?: string; domain?: string; stack?: string; identity?: string; currentState?: string }) => {
    void runInit(options)
  })

// ---------------------------------------------------------------------------
// mexai map
// ---------------------------------------------------------------------------

program
  .command('map')
  .description('Scan the codebase and generate/update codebase.md')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('--quality <mode>', 'Quality gate: standard (default) | strict. Strict fails if Key Files, Conventions, Patterns, Do Not Touch are empty.')
  .option('--json', 'Output as JSON (machine-readable)')
  .action((options: { project?: string; quality?: string; json?: boolean }) => {
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
  .option('--json', 'Output as JSON (machine-readable)')
  .action((options: { project?: string; discard?: boolean; json?: boolean }) => {
    void runDiff(options)
  })

// ---------------------------------------------------------------------------
// mexai commit
// ---------------------------------------------------------------------------

program
  .command('commit')
  .description('Apply the pending diff and commit to the store')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('--json', 'Output as JSON (machine-readable)')
  .action((options: { project?: string; json?: boolean }) => {
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
    void runLink(slug, options)
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
  .option('--json', 'Output as JSON (machine-readable)')
  .action((options: { project?: string; json?: boolean }) => {
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
  .description('Open a layer file in $EDITOR, or write it non-interactively')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('--layer <layer>', 'Layer to edit: context | codebase | rules (default: context)')
  .option('--from-file <path>', 'Write content from a file to the layer (non-interactive)')
  .option('--stdin', 'Read content from stdin and write to the layer (non-interactive)')
  .option('--print-path', 'Print the file path and exit (for scripting)')
  .option('--json', 'Output operation result as JSON (machine-readable)')
  .action((options: { project?: string; layer?: string; fromFile?: string; stdin?: boolean; printPath?: boolean; json?: boolean }) => {
    void runEdit(options)
  })

// ---------------------------------------------------------------------------
// mexai context-save
// ---------------------------------------------------------------------------

program
  .command('context-save')
  .description('Stage context changes without opening an editor (CLI parity with MCP context_save)')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('--message <msg>', 'Commit message (required, max 72 chars)')
  .option('--decisions <json>', 'JSON array of decisions: [{title, rationale, date?}]')
  .option('--current-state <str>', 'Replace the current state description')
  .option('--threads <json>', 'JSON array of threads: [{action: add|check_off, content}]')
  .option('--source <src>', 'Context source: claude-code | cursor | vscode | opencode | manual (default: manual)')
  .option('--from-file <path>', 'Load changes from a JSON file instead of inline flags')
  .option('--dry-run', 'Preview the diff without staging it')
  .action((options: { project?: string; message?: string; decisions?: string; currentState?: string; threads?: string; source?: string; fromFile?: string; dryRun?: boolean }) => {
    void runContextSave(options)
  })

// ---------------------------------------------------------------------------
// mexai validate
// ---------------------------------------------------------------------------

program
  .command('validate')
  .description('Check project files for integrity issues (frontmatter, duplicates, missing files)')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .action((options: { project?: string }) => {
    void runValidate(options)
  })

// ---------------------------------------------------------------------------
// mexai doctor
// ---------------------------------------------------------------------------

program
  .command('doctor')
  .description('Detect and auto-repair malformed project files')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('--apply', 'Write repairs to disk (default: dry-run, shows what would change)')
  .action((options: { project?: string; apply?: boolean }) => {
    void runDoctor(options)
  })

// ---------------------------------------------------------------------------
// mexai apply
// ---------------------------------------------------------------------------

program
  .command('apply')
  .description('Atomic pipeline: stage changes and commit immediately (no manual diff step)')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('--message <msg>', 'Commit message (required, max 72 chars)')
  .option('--decisions <json>', 'JSON array of decisions: [{title, rationale, date?}]')
  .option('--current-state <str>', 'Replace the current state description')
  .option('--threads <json>', 'JSON array of threads: [{action: add|check_off, content}]')
  .option('--source <src>', 'Context source (default: manual)')
  .option('--from-file <path>', 'Load changes from a JSON file')
  .option('--validate', 'Run validation before applying (fails if issues found)')
  .action((options: { project?: string; message?: string; decisions?: string; currentState?: string; threads?: string; source?: string; fromFile?: string; validate?: boolean }) => {
    void runApply(options)
  })

// ---------------------------------------------------------------------------
// mexai export
// ---------------------------------------------------------------------------

program
  .command('export')
  .description('Export flat context files (AGENTS.md, CLAUDE.md, .cursorrules) to the project root')
  .option('-p, --project <slug>', 'Project slug (defaults to active project)')
  .option('--dir <path>', 'Output directory (defaults to cwd)')
  .option('--json', 'Output as JSON with completeness audit (machine-readable)')
  .action((options: { project?: string; dir?: string; json?: boolean }) => {
    void runExport(options)
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
