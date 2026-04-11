---
title: log, restore, link & load
description: Browse context history, restore previous states, and manage project registrations.
---

## mexai log

Shows the git commit history for the project store.

### Usage

```bash
mexai log [options]
```

### Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `-n <count>` | Number of log entries to show (default: 10) |

### Example output

```
Log — my-api

  abc1234  2 hours ago    mexai: commit — Switch to Zod v4
  def5678  yesterday      mexai: commit — Add auth middleware decision
  ghi9012  3 days ago     mexai: initial codebase scan
  jkl3456  3 days ago     mexai: initial project setup
```

---

## mexai restore

Restores the project store to a specific git commit. **Destructive** — confirms before proceeding.

### Usage

```bash
mexai restore <hash> [options]
```

### Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `-y, --yes` | Skip confirmation prompt |

### Example

```bash
mexai restore abc1234
# Are you sure you want to restore to abc1234? (y/N) y
# ✓  Restored to abc1234.
```

Use `mexai log` to find the hash you want to restore to.

---

## mexai link

Registers a codebase path for an existing project. Use this when you've moved a project directory or want to link a new checkout.

### Usage

```bash
mexai link <slug> [options]
```

### Options

| Flag | Description |
|---|---|
| `--path <path>` | Path to register (defaults to current directory) |

### Examples

Link the current directory to an existing project:

```bash
mexai link my-api
```

Link a specific path:

```bash
mexai link my-api --path /new/path/to/my-api
```

---

## mexai load

Sets the active project — used when no `mexai.json` is present and you want a fallback default.

### Usage

```bash
mexai load <slug>
```

### Example

```bash
mexai load my-api
# ✓  Active project set to: my-api
```

The active project is used as a last resort by commands that can't auto-detect a project from `mexai.json`. It's stored in `~/.mexai/active`.

---

## mexai list

Lists all registered projects.

### Usage

```bash
mexai list
# alias: mexai ls
```

### Example output

```
Projects

  ❯  my-api           /path/to/my-api         active
     other-project    /path/to/other-project
     side-project     /path/to/side-project
```

The `❯` marker indicates the currently active project.
