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
mexai init          → scaffolds project context, auto-scans codebase, shows AI bootstrap prompt
mexai connect       → writes MCP config AND exports AGENTS.md / CLAUDE.md / .cursorrules
```

After `mexai init`, a **bootstrap prompt** is printed in your terminal. Paste it into your AI editor (Cursor, Claude Code, etc.) — the AI will use MCP tools to fill in a comprehensive project context: identity, current state, key decisions, conventions, and key files. No manual editing required.

Then review and apply what the AI proposed:

```
mexai diff          → review what the AI proposed
mexai commit        → apply it and commit to git history
```

From that point, every AI session starts with a precise, token-efficient snapshot of your project. No re-reading. No re-explaining. No drift.

**Auto-detection:** After init, a `mexai.json` file is written to your project root. Every subsequent command automatically finds the right project — no `--project` flag needed. Works like `.git`.

When an agent learns something worth saving — a decision made, a convention established — it proposes an update, which you review and approve the same way:

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
# 1. Go into your project directory and initialise
cd /path/to/your/project
mexai init

# mexai init will:
#   - Ask a few quick questions (name, stack, domain)
#   - Auto-scan your codebase and write a draft codebase.md
#   - Write mexai.json for auto-detection in future commands
#   - Show a bootstrap prompt to paste into your AI editor

# 2. Paste the bootstrap prompt into your AI editor (Cursor / Claude Code / etc.)
#    The AI uses MCP tools to fill in full project context automatically.

# 3. Review and apply the AI's proposed context
mexai diff
mexai commit

# 4. Connect your editor (writes MCP config + exports flat files)
mexai connect cursor
mexai connect claude-code

# 5. Start your session — the AI already knows your project
```

## CLI Reference

| Command | Description |
|---|---|
| `mexai init` | Scaffold project context, auto-scan codebase, show AI bootstrap prompt |
| `mexai map` | Re-scan codebase and update `codebase.md` |
| `mexai connect <agent>` | Write MCP config and export flat files |
| `mexai diff` | Review AI-proposed context updates |
| `mexai commit` | Apply and commit approved changes |
| `mexai link <slug>` | Register a codebase path for an existing project |
| `mexai load <slug>` | Set the active project |
| `mexai list` | List all projects |
| `mexai status` | Show active project and pending changes |
| `mexai log` | Show context change history |
| `mexai restore <hash>` | Restore context store to a specific git commit |
| `mexai edit` | Open a layer file in `$EDITOR` |
| `mexai export` | Write flat files to current directory |
| `mexai sync` | Push context to GitHub sidecar repo (optional) |
| `mexai serve` | Start MCP server over stdio |

All commands auto-detect the project from `mexai.json` in the current directory (or any parent). Pass `-p <slug>` to override.

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

```
your-project/
└── mexai.json               ← written by init/map/connect, enables auto-detection
```

All context is local. GitHub sync is opt-in via `mexai sync`. No account required.

## What Mexai Is Not

- Not a chat logger or conversation history tool
- Not auto-saving without your review — you approve every change
- Not cloud-dependent — everything works offline
- Not another `.cursorrules` wrapper — it manages all three layers with proper tooling