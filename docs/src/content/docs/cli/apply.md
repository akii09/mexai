---
title: mexai apply
description: Atomic pipeline — stage context changes and commit immediately in one step.
---

Combines `mexai context-save` and `mexai commit` into a single atomic command. Use this when you trust the change and want to skip the manual review step.

## Usage

```bash
mexai apply [options]
```

## Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `--message <msg>` | Commit message — required, max 72 characters |
| `--decisions <json>` | JSON array of decisions to add |
| `--current-state <str>` | Replace the current state description |
| `--threads <json>` | JSON array of thread operations |
| `--source <src>` | Context source (default: `manual`) |
| `--from-file <path>` | Load changes from a JSON file |
| `--validate` | Run validation before applying (fails if issues found) |

## Examples

Quick decision log:

```bash
mexai apply \
  --message "Use Redis for sessions" \
  --decisions '[{"title":"Redis for sessions","rationale":"Needed for multi-server deployments"}]'
```

With validation:

```bash
mexai apply --validate \
  --message "Post-session update" \
  --current-state "Implementing payment webhooks"
```

From a file:

```bash
mexai apply --from-file ./update.json
```

## `--validate` flag

When `--validate` is passed, mexai runs `mexai validate` checks before staging. If any issues are found, the command exits with an error and nothing is written.

Checks performed:
- `context.md` frontmatter validity
- No duplicate decision titles
- `codebase.md` and `rules.md` exist and have content

## Difference from context-save

| | `context-save` | `apply` |
|---|---|---|
| Stages changes | ✓ | ✓ |
| Requires `mexai commit` | ✓ | — |
| Commits immediately | — | ✓ |
| Shows diff before applying | via `mexai diff` | — |

Use `context-save` + `diff` + `commit` when you want to review. Use `apply` when you're confident.
