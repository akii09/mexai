---
title: mexai context-save
description: Stage context changes from the CLI — decisions, current state, open threads.
---

Stages context changes without opening an editor. This is the CLI equivalent of the MCP `context_save` tool — useful for scripting, CI, or manually adding decisions from the terminal.

Changes are **staged** (written to `pending-diff.json`) and not applied until you run `mexai commit` or `mexai apply`.

## Usage

```bash
mexai context-save [options]
```

## Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `--message <msg>` | Commit message — required, max 72 characters |
| `--decisions <json>` | JSON array of decisions to add |
| `--current-state <str>` | Replace the current state description |
| `--threads <json>` | JSON array of thread operations |
| `--source <src>` | Context source: `claude-code`, `cursor`, `vscode`, `opencode`, `manual` (default: `manual`) |
| `--from-file <path>` | Load changes from a JSON file instead of inline flags |
| `--dry-run` | Preview the diff without staging it |

## Examples

Add a decision:

```bash
mexai context-save \
  --message "Adopt Zod v4" \
  --decisions '[{"title":"Use Zod v4","rationale":"Better performance, smaller bundle"}]'
```

Update current state:

```bash
mexai context-save \
  --message "Starting auth refactor" \
  --current-state "Refactoring the auth middleware to use JWT."
```

Multiple changes at once:

```bash
mexai context-save \
  --message "Post-session context update" \
  --decisions '[{"title":"Remove class-validator","rationale":"Consolidating to Zod"}]' \
  --current-state "Migrating validation layer to Zod v4" \
  --source claude-code
```

From a file:

```bash
mexai context-save --from-file ./context-update.json
```

Preview without staging:

```bash
mexai context-save --dry-run \
  --message "Test decision" \
  --decisions '[{"title":"Try Redis","rationale":"Need faster cache"}]'
```

## Decision format

```json
[
  {
    "title": "Use Zod v4",
    "rationale": "Better performance and smaller bundle size",
    "date": "2024-01-15"
  }
]
```

`date` is optional — defaults to today.

## Thread format

```json
[
  { "action": "add", "content": "Investigate connection pooling" },
  { "action": "check_off", "content": "Set up CI pipeline" }
]
```

## From-file format

```json
{
  "message": "Post-session update",
  "source": "claude-code",
  "decisions": [...],
  "currentState": "...",
  "threads": [...]
}
```

## Idempotency

Decisions are deduplicated by title (case-insensitive) against the already-committed context. If you save the same decision twice, the second one is silently skipped.

## After staging

```bash
mexai diff     # review what was staged
mexai commit   # apply it
```

Or combine into one step:

```bash
mexai apply --message "..." --decisions '[...]'
```
