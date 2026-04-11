---
title: validate & doctor
description: Check project files for integrity issues and auto-repair malformed frontmatter.
---

## mexai validate

Checks project files for integrity issues without making any changes.

### Usage

```bash
mexai validate [options]
```

### Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |

### Checks performed

| Check | Description |
|---|---|
| `context.md` frontmatter | All required fields present and valid |
| Duplicate decisions | No two decisions share the same title |
| `codebase.md` exists | File is present and has content |
| `rules.md` exists | File is present and has content |

### Example output

```
Validating — my-api

  ✓  context.md frontmatter is valid
  ✓  No duplicate decision titles
  ✗  codebase.md is missing or empty
       Run  mexai map  to generate it.
  ✓  rules.md is present and has content

1 issue found.
```

### Exit codes

- `0` — all checks pass
- `1` — one or more checks fail

---

## mexai doctor

Detects and auto-repairs malformed `context.md` frontmatter. **Dry-run by default** — shows what would change without writing anything.

### Usage

```bash
mexai doctor [options]
```

### Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `--apply` | Write repairs to disk (default: dry-run) |

### What it repairs

Doctor repairs missing or invalid frontmatter fields with safe defaults:

| Field | Default if missing |
|---|---|
| `name` | From project registry |
| `slug` | From project registry |
| `domain` | `"unknown"` |
| `stack` | `["unknown"]` |
| `status` | `"active"` |
| `createdAt` | Today's date |
| `updatedAt` | Today's date |

### Dry-run output

```
Doctor — my-api

Slug     my-api
Mode     dry-run (use --apply to write changes)

! context.md has frontmatter issues:
  missing required field: domain
  missing required field: stack

Repairs:
  ~ domain:  undefined → "unknown"
  ~ stack:   undefined → ["unknown"]

Run  mexai doctor --apply  to write these repairs to disk.
```

### Apply mode

```bash
mexai doctor --apply
```

After applying:
1. Repairs are written to `context.md`
2. A git commit is created in the store (`mexai: doctor — repair context.md frontmatter`)
3. `mexai status` shows `● CLEAN`

### Typical workflow

```bash
mexai validate          # find issues
mexai doctor            # see what doctor would fix (dry-run)
mexai doctor --apply    # apply the repairs
mexai validate          # confirm all checks pass
```
