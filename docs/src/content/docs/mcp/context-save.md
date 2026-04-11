---
title: context_save
description: Stage context changes — decisions, current state, open threads — for review and commit.
---

Stages context changes from the AI agent. Changes are written to `pending-diff.json` and must be reviewed and committed by the developer via `mexai diff` + `mexai commit`.

## Input schema

```typescript
{
  workspacePath?: string       // path to project directory
  slug?: string                // explicit project slug
  source: string               // "claude-code" | "cursor" | "vscode" | "opencode" | "manual"
  message: string              // commit message, max 72 chars
  sessionNote?: string         // optional note about the session
  dryRun?: boolean             // preview without writing (default: false)
  changes: {
    decisions?: Array<{
      title: string
      rationale: string
      date?: string            // ISO date, defaults to today
    }>
    currentState?: string      // replaces the current state
    threads?: Array<{
      action: "add" | "check_off"
      content: string
    }>
  }
}
```

## Output

```json
{
  "success": true,
  "staged": true,
  "dryRun": false,
  "hasChanges": true,
  "skippedDuplicateDecisions": 0,
  "important": "Changes are STAGED, not committed. The developer must run `mexai diff` to review and `mexai commit` to apply.",
  "committedSnapshot": {
    "identity": "REST API for managing user subscriptions.",
    "currentState": "Migrating validation layer to Zod v4",
    "decisionsCount": 5
  }
}
```

## Idempotency

Decisions are deduplicated by title (case-insensitive) against the already-committed context. If the same decision title was previously committed, it won't be staged again. The `skippedDuplicateDecisions` count tells you how many were skipped.

## Dry-run mode

Set `dryRun: true` to preview what would be staged without writing to disk:

```json
{
  "workspacePath": "/path/to/project",
  "source": "claude-code",
  "message": "Test decision",
  "dryRun": true,
  "changes": {
    "decisions": [{"title": "Test", "rationale": "Testing dry run"}]
  }
}
```

The response will have `"dryRun": true` and `"staged": false`.

## Merge rules

When multiple `context_save` calls happen before a `mexai commit`, they are merged:

| Field | Merge strategy |
|---|---|
| `decisions` | Append (all decisions kept) |
| `currentState` | Last write wins |
| `threads.add` | Dedup by content |
| `threads.check_off` | Cancels a pending `add` with same content |

## Important: staged, not committed

The agent's changes are **staged** — they don't go into `context.md` until the developer runs `mexai commit`. This is by design. The developer always reviews before anything is applied.

The `important` field in the response reminds the agent of this. Agents should communicate clearly to the user: *"I've staged these changes — run `mexai diff` to review and `mexai commit` to apply."*

## Error responses

| Error code | Meaning |
|---|---|
| `VALIDATION_ERROR` | Input failed schema validation |
| `NO_ACTIVE_PROJECT` | Project not found |
| `STORE_ERROR` | Filesystem error |
