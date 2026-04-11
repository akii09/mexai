---
title: State Model
description: The three project states — CLEAN, STAGED, DIRTY — and how to transition between them.
---

Every mexai project is in one of three states at any time.

## States

### `● CLEAN`

No pending diff, and the store git has no uncommitted changes.

This is the resting state after `mexai commit` or `mexai doctor --apply`.

```bash
mexai status
# ● CLEAN — nothing to do
```

### `● STAGED`

A `pending-diff.json` file exists in the store. Context changes have been staged (by the agent via `context_save`, or by you via `mexai context-save`) and are waiting to be reviewed and committed.

```bash
mexai status
# ● STAGED — 2 decisions pending
#   Run  mexai diff   to review the pending changes.
#   Run  mexai commit  to apply them.
```

**Transitions from STAGED:**
- `mexai commit` → `● CLEAN`
- `mexai diff --discard` → `● CLEAN`
- `mexai apply` → `● CLEAN`

### `● DIRTY`

The store git has uncommitted changes. This happens when:
- `mexai edit` writes directly to a layer file
- `mexai doctor --apply` repairs frontmatter (before committing)
- Manual edits to store files

```bash
mexai status
# ● DIRTY — store has uncommitted changes
#   Run  mexai commit  to record the changes.
```

**Note:** `mexai doctor --apply` automatically commits after repairing, so you won't normally see DIRTY after doctor.

## State transitions

```
CLEAN
  │
  ├── context_save / mexai context-save ──→ STAGED
  │        │
  │   mexai commit / mexai apply ──────────→ CLEAN
  │   mexai diff --discard ────────────────→ CLEAN
  │
  └── mexai edit ──────────────────────────→ DIRTY
           │
       mexai commit ──────────────────────→ CLEAN
```

## Checking state

### Human output

```bash
mexai status
```

### JSON output

```bash
mexai status --json
```

```json
{
  "state": "staged",        // "clean" | "staged" | "dirty"
  "hasPendingDiff": true,
  "storeDirty": false
}
```

| Field | Meaning |
|---|---|
| `state` | The computed state (`clean`, `staged`, `dirty`) |
| `hasPendingDiff` | `pending-diff.json` exists |
| `storeDirty` | Store git has uncommitted changes |

The `state` field is computed as:
- `"staged"` if `hasPendingDiff === true`
- `"dirty"` if `storeDirty === true`
- `"clean"` otherwise

Note: `storeDirty` takes lower precedence than `hasPendingDiff` — if both are true, state is `"staged"`.
