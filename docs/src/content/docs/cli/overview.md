---
title: CLI Overview
description: Complete reference for all mexai CLI commands.
---

mexai ships with 15+ commands covering the full context lifecycle. All commands support `--project <slug>` to target a specific project when auto-detection isn't available.

## Command groups

### Setup
| Command | Description |
|---|---|
| [`mexai init`](/cli/init) | Initialise a new project context store |
| [`mexai map`](/cli/map) | Scan the codebase and generate/update `codebase.md` |
| [`mexai connect`](/cli/connect) | Configure MCP for your AI editor |
| [`mexai link`](/cli/log-restore) | Register a codebase path for an existing project |
| [`mexai load`](/cli/log-restore) | Set the active project |

### Daily workflow
| Command | Description |
|---|---|
| [`mexai status`](/cli/status) | Show current project state |
| [`mexai diff`](/cli/diff-commit) | Show the pending diff |
| [`mexai commit`](/cli/diff-commit) | Apply the pending diff |
| [`mexai context-save`](/cli/context-save) | Stage context changes from the CLI |
| [`mexai apply`](/cli/apply) | Stage + commit in one step |

### Content editing
| Command | Description |
|---|---|
| [`mexai edit`](/cli/edit) | Open a layer file in `$EDITOR` |
| [`mexai export`](/cli/export) | Export flat files (AGENTS.md, CLAUDE.md, .cursorrules) |

### Integrity
| Command | Description |
|---|---|
| [`mexai validate`](/cli/validate-doctor) | Check project files for issues |
| [`mexai doctor`](/cli/validate-doctor) | Auto-repair malformed files |

### History
| Command | Description |
|---|---|
| [`mexai log`](/cli/log-restore) | Show git history for the project store |
| [`mexai restore`](/cli/log-restore) | Restore to a specific git commit |

### Sync
| Command | Description |
|---|---|
| [`mexai sync`](/cli/sync) | Sync with GitHub |
| [`mexai serve`](/mcp/overview) | Start the MCP server |

## Global flags

All commands that operate on a project accept:

```
-p, --project <slug>    Target a specific project by slug
```

## JSON output

Most commands support `--json` for machine-readable output:

```bash
mexai status --json
mexai diff --json
mexai commit --json
mexai map --json
mexai export --json
```

JSON output always includes a `success` field and uses `process.exitCode = 1` on failure.

## Project auto-detection

mexai finds your project by walking up the directory tree looking for `mexai.json` — the file written to your project root by `mexai init`. No flags needed when you're inside a registered project.

```bash
cd /path/to/my-project
mexai status   # auto-detects the right project
```
