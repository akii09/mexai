---
title: mexai init
description: Initialise a new project context store with an interactive wizard or CI-safe non-interactive mode.
---

Creates a new project context store at `~/.mexai/projects/<slug>/`, writes `mexai.json` to the current directory, and runs an initial codebase scan.

## Usage

```bash
mexai init [options]
```

## Interactive mode (default)

Running `mexai init` without flags launches an interactive wizard:

```
? Project name: my-api
? Domain (e.g. web-app, cli-tool, api, library): api
? Stack (comma-separated, e.g. TypeScript, React, Node.js): TypeScript, Node.js, Express
? One-line project description (for AI context): REST API for managing user subscriptions
? Current state of the project (what are you working on?): Initial setup.
```

After confirming, mexai:
1. Creates `~/.mexai/projects/<slug>/` with `context.md`, `codebase.md`, `rules.md`
2. Initialises git in the store directory
3. Runs `mexai map` automatically to generate an initial `codebase.md`
4. Writes `mexai.json` to the current directory for auto-detection
5. Shows an AI bootstrap prompt to paste into your editor

## Non-interactive mode (`--yes`)

For CI pipelines and scripting:

```bash
mexai init --yes \
  --name "my-api" \
  --domain "api" \
  --stack "TypeScript,Node.js" \
  --identity "REST API for managing user subscriptions" \
  --current-state "Initial setup"
```

In `--yes` mode, all guards are handled silently (idempotent — safe to run on every CI run).

## Options

| Flag | Description |
|---|---|
| `--slug <slug>` | Override the auto-generated slug |
| `-y, --yes` | Non-interactive mode: accept all defaults |
| `--name <name>` | Project name (with `--yes`) |
| `--domain <domain>` | Project domain (with `--yes`, default: `web-app`) |
| `--stack <stack>` | Comma-separated stack (with `--yes`, default: `TypeScript`) |
| `--identity <text>` | One-line project description (with `--yes`) |
| `--current-state <text>` | Current development state (with `--yes`) |

## Guards

**Directory already linked:** If `mexai.json` already exists in the current directory, mexai offers to use the existing project instead of creating a new one.

**Slug collision:** If the project name produces a slug that already exists in the registry, mexai offers to link the current directory to the existing project or choose a different name.

## What it creates

```
~/.mexai/projects/<slug>/
├── context.md      ← project identity, state, decisions
├── codebase.md     ← generated codebase map (draft)
├── rules.md        ← agent rules (starter template)
└── .git/           ← full git history

<cwd>/
└── mexai.json      ← links this directory to the project slug
```

## After init

```bash
mexai edit --layer codebase   # review and refine the codebase map
mexai connect --editor cursor  # configure MCP for your editor
mexai status                   # confirm everything looks right
```
