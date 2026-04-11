---
title: mexai status
description: Show the current state of the active project — pending diff, store cleanliness, and remediation hints.
---

Shows the current status of a project including its state, pending diff summary, and what to do next.

## Usage

```bash
mexai status [options]
```

## Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `--json` | Output as JSON (machine-readable) |

## States

### `● CLEAN`
No pending diff, store git is clean. Nothing to do.

### `● STAGED`
A pending diff exists in `pending-diff.json`. Run `mexai diff` to review, then `mexai commit` to apply.

### `● DIRTY`
The store git has uncommitted changes (e.g. after `mexai edit` or `mexai doctor --apply`). Run `mexai commit` or review with `mexai diff`.

## Human output

```
Project  my-api
Slug     my-api
Path     /path/to/my-api

● STAGED — 2 decisions pending

  Run  mexai diff   to review the pending changes.
  Run  mexai commit  to apply them.
```

## JSON output

```bash
mexai status --json
```

```json
{
  "slug": "my-api",
  "name": "My API",
  "path": "/path/to/my-api",
  "remote": null,
  "state": "staged",
  "hasPendingDiff": true,
  "storeDirty": false,
  "pendingDiff": {
    "message": "Add auth middleware decision",
    "source": "claude-code",
    "decisions": [
      {
        "title": "Use JWT for auth",
        "rationale": "Stateless, works well with our microservice setup",
        "date": "2024-01-15"
      }
    ],
    "currentState": null,
    "threads": []
  },
  "remediation": "Run  mexai diff  to review, then  mexai commit  to apply."
}
```

## State values

| `state` | Meaning |
|---|---|
| `"clean"` | No pending diff, store is clean |
| `"staged"` | `pending-diff.json` exists |
| `"dirty"` | Store git has uncommitted changes |
