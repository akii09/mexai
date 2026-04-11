---
title: GitHub Sync
description: Back up and share your project context store via GitHub.
---

mexai can sync the project store to a GitHub repository, giving you a remote backup and enabling multi-machine workflows.

## Prerequisites

- A GitHub account
- `GITHUB_TOKEN` environment variable with `repo` scope

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

## Initial setup

Create a GitHub repo and push the store:

```bash
mexai sync init
```

This creates a private GitHub repository named `<slug>-mexai` and pushes your local store. The remote URL is saved in the registry.

Customise the repo name:

```bash
mexai sync init my-project-context
```

Create as a public repo:

```bash
mexai sync init --public
```

## Push and pull

Push local changes:

```bash
mexai sync --push
```

Pull remote changes:

```bash
mexai sync --pull
```

Pull-then-push (default sync):

```bash
mexai sync
```

## Check sync status

```bash
mexai sync --status

# Local ahead:   2 commits
# Remote ahead:  0 commits
# Last synced:   3 hours ago
```

## Setting up on a new machine

Clone an existing context store:

```bash
mexai sync clone https://github.com/you/my-project-mexai.git
```

This downloads the store to `~/.mexai/projects/<slug>/` and registers it locally. Then link it to your local project directory:

```bash
cd /path/to/my-project
mexai link my-project
```

## Typical multi-machine workflow

```
Machine A                          Machine B
─────────                          ─────────
mexai commit                       mexai sync --pull
mexai sync --push          →       mexai status
                                   # context is up to date
```

## Conflict handling

If both machines have diverged, `mexai sync --pull` detects the conflict and reports it without silently merging. You'll need to resolve it manually:

```bash
cd ~/.mexai/projects/<slug>
git status          # see the conflict
git diff            # review
# resolve manually, then:
git add context.md
git commit -m "mexai: resolve sync conflict"
mexai sync --push
```

## Notes

- The context store is a standard git repository — you can push/pull manually with `git` as well
- Private repos are the default (your project context may contain sensitive architectural details)
- `mexai sync` does not sync your codebase — only the context store at `~/.mexai/projects/<slug>/`
