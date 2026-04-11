---
title: diff & commit
description: Review and apply pending context changes.
---

## mexai diff

Shows the pending diff — the context changes staged by `context_save` or `mexai context-save` that haven't been committed yet.

### Usage

```bash
mexai diff [options]
```

### Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `--discard` | Discard the pending diff without applying |
| `--json` | Output as JSON (machine-readable) |

### Example output

```
Pending diff — my-api
Source    claude-code
Message   Switch to Zod v4 for validation

Decisions (2 new):
  + Use Zod v4
    Rationale: Better performance and smaller bundle size
  + Remove class-validator
    Rationale: Consolidating to single validation library

Current State:
  ~ Migrating validation layer to Zod v4

Run  mexai commit  to apply these changes.
Run  mexai diff --discard  to throw them away.
```

### JSON output

```json
{
  "slug": "my-api",
  "name": "My API",
  "hasPendingDiff": true,
  "pendingDiff": {
    "message": "Switch to Zod v4",
    "source": "claude-code",
    "decisions": [...],
    "currentState": "Migrating validation layer to Zod v4",
    "threads": []
  }
}
```

### Discarding

To throw away staged changes without applying:

```bash
mexai diff --discard
```

---

## mexai commit

Applies the pending diff to `context.md` and creates a git commit in the project store.

### Usage

```bash
mexai commit [options]
```

### Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `--json` | Output as JSON (machine-readable) |

### What it does

1. Reads `pending-diff.json`
2. Applies the diff to `context.md` using the merge rules:
   - Decisions **append** (newest at top)
   - Open threads **dedup** by content
   - Current state **last write wins**
3. Writes the updated `context.md` via StoreManager
4. Creates a git commit in `~/.mexai/projects/<slug>/`
5. Clears `pending-diff.json`

### JSON output

```json
{
  "slug": "my-api",
  "name": "My API",
  "committed": true,
  "commitHash": "abc1234",
  "message": "Switch to Zod v4",
  "changes": {
    "decisionsAdded": 2,
    "threadsResolved": 0,
    "currentStateChanged": true
  }
}
```

### No pending diff

```json
{
  "slug": "my-api",
  "name": "My API",
  "committed": false,
  "reason": "No pending diff."
}
```
