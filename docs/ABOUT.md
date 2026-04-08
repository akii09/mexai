# About Mexai

Mexai makes AI understand your codebase instantly and stay consistent across sessions.

## The Problem

Every new AI session starts blind.

The agent reads your folder structure, scans key files, re-derives your conventions — and burns hundreds of tokens just to orient itself. That's before it writes a single line of code. Switch tools, start a new session, or bring in a different agent — and the whole process repeats.

The deeper problem is consistency. Different agents make different assumptions. One uses `cn()`, another reaches for `clsx()` directly. Error handling is centralized in half the codebase and inline in the other half. Nobody told the agent how *you* do things — so it did things its own way. Multiply that across sessions and you end up with a codebase that reads like five people wrote it.

`CLAUDE.md` and `.cursorrules` exist, but they're flat files you maintain by hand, with no structure, no tooling, and no way to keep them accurate as the project evolves.

There is no single tool that solves context, conventions, and agent rules together — until now.

## What Mexai Is

Mexai is a local-first context manager for AI-assisted development.

It maintains three things about your project — what you're building, how your codebase works, and the rules every agent must follow — and injects them precisely into every AI session, using the minimum tokens required.

It works via **MCP** for agents that support it (Cursor, Claude Code, VS Code, OpenCode) and via **exported flat files** for every other agent. One tool, full compatibility.

The core principle: AI agents can propose context updates, but you review and approve every change before it's committed. The context is always yours.

## How It Works

```
mexai init          → scaffolds project context, codebase map, and agent rules
mexai map           → scans your repo and generates a codebase map draft you review once
mexai connect       → writes MCP config AND exports AGENTS.md / CLAUDE.md / .cursorrules
```

From that point, every AI session starts with a precise, token-efficient snapshot of your project. No re-reading. No re-explaining. No drift.

When an agent learns something worth saving — a decision made, a convention established — it proposes an update:

```
mexai diff          → review what the AI proposed
mexai commit        → apply it and commit to git history
```

Every context change is version-controlled. You can see what changed, when, and why.

## Token Efficiency

Raw codebase orientation burns 2,000–8,000 tokens per session just to answer "what is this project and how does it work?"

Mexai's targeted injection answers the same question in **400–700 tokens** — a predictable budget that doesn't grow as your project does.

## Compatibility

| Agent | How |
|---|---|
| Cursor | MCP (native) |
| Claude Code | MCP (native) |
| VS Code | MCP (native) |
| OpenCode | MCP (native) |
| Any other agent | `AGENTS.md` / `CLAUDE.md` / `.cursorrules` export |

## Install

```bash
npm install -g mexai
```

Requirements: Node.js 20+, Git in `PATH`.

## Quick Start

```bash
# 1. Create context for your project
mexai init "My Project"

# 2. Generate a codebase map (review and edit the draft)
mexai map

# 3. Connect your editor
mexai connect cursor
mexai connect claude-code

# 4. Start your session — the AI already knows your project
```

## CLI Reference

| Command | Description |
|---|---|
| `mexai init [name]` | Scaffold project context, codebase map, and rules |
| `mexai map` | Generate a codebase map from your repo structure |
| `mexai connect <agent>` | Write MCP config and export flat files |
| `mexai diff` | Review AI-proposed context updates |
| `mexai commit <message>` | Apply and commit approved changes |
| `mexai load <slug>` | Set the active project |
| `mexai list` | List all projects |
| `mexai status` | Show active project and pending changes |
| `mexai log` | Show context change history |
| `mexai export` | Write flat files to current directory |
| `mexai sync` | Push context to GitHub sidecar repo (optional) |
| `mexai serve` | Start MCP server over stdio |

## Context Store

```
~/.mexai/
├── active
├── config.json
└── projects/
    └── <slug>/
        ├── context.md       ← project context (what, why, current state, decisions)
        ├── codebase.md      ← codebase map (structure, conventions, key files)
        ├── rules.md         ← agent rules (quality gates, non-negotiables)
        └── pending-diff.json
```

All context is local. GitHub sync is opt-in via `mexai sync`. No account required.

## What Mexai Is Not

- Not a chat logger or conversation history tool
- Not auto-saving without your review — you approve every change
- Not cloud-dependent — everything works offline
- Not another `.cursorrules` wrapper — it manages all three layers with proper tooling