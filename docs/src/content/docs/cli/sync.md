---
title: mexai sync
description: Sync the project context store with GitHub for team sharing and backup.
---

Syncs the project store with a GitHub remote. Useful for sharing context across machines or collaborating with a small team.

## Usage

```bash
mexai sync [options]
mexai sync init [repoName]
mexai sync clone <url>
```

## Commands

### `mexai sync --push`

Pushes local context changes to the GitHub remote.

```bash
mexai sync --push
```

### `mexai sync --pull`

Pulls remote changes to the local store. Detects and reports conflicts without silently overwriting.

```bash
mexai sync --pull
```

### `mexai sync` (default)

Pull-then-push. Ensures you're up to date before pushing.

```bash
mexai sync
```

### `mexai sync --status`

Shows sync status without making changes.

```bash
mexai sync --status
# Local ahead:   2 commits
# Remote ahead:  0 commits
# Last synced:   2 hours ago
```

### `mexai sync init`

Creates a GitHub repository and links it as the remote for this project store. Requires `GITHUB_TOKEN` in your environment.

```bash
mexai sync init                        # repo name defaults to <slug>-mexai
mexai sync init my-project-context    # custom repo name
mexai sync init --public               # create as public repo (default: private)
```

### `mexai sync clone`

Clones a remote context store to your local machine and registers it.

```bash
mexai sync clone https://github.com/you/my-project-mexai.git
mexai sync clone <url> --slug custom-slug
```

## Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `--push` | Push local changes to remote |
| `--pull` | Pull remote changes to local |
| `--status` | Show sync status |

## `sync init` options

| Flag | Description |
|---|---|
| `--public` | Create a public repository (default: private) |

## `sync clone` options

| Flag | Description |
|---|---|
| `--slug <slug>` | Local slug for the cloned project |

## Requirements

- `GITHUB_TOKEN` environment variable with `repo` scope (for `sync init`)
- Git configured with push access to the remote (for `sync --push`)

## Notes

- The context store is a standalone git repo — you can also push/pull manually with standard git commands
- `sync --pull` never silently merges — conflicts are reported and require manual resolution
- Store path: `~/.mexai/projects/<slug>/`
