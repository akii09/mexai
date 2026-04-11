---
title: Introduction
description: mexai — local-first AI context manager that keeps every AI agent perfectly in sync with your project.
---

**mexai** is a local-first AI context manager. It maintains three layers of structured context per project and injects them token-efficiently into any AI session — so every agent always knows who you are, what you're building, and what decisions you've made.

## The problem

Every time you start a new AI session, you re-explain your project from scratch. The AI doesn't know your stack, your decisions, your conventions, or what you're currently working on. Context is lost between sessions. Agents give inconsistent answers because they're working from different foundations.

## The solution

mexai gives every AI agent a persistent, structured memory of your project:

- **Project context** — identity, current state, open threads, key decisions
- **Codebase map** — key files, conventions, patterns, do-not-touch zones
- **Agent rules** — code quality rules, security rules, review gates

This context lives in `~/.mexai/projects/<slug>/` as plain Markdown files, version-controlled with git. You own it. No cloud required.

## How it works

```
Your project
     │
     ▼
mexai init          ← creates context store
mexai map           ← scans codebase, generates draft
mexai connect       ← configures MCP for your AI editor
     │
     ▼
AI editor reads context on every session via MCP
     │
     ▼
Agent saves decisions/state via context_save
     │
     ▼
mexai diff → mexai commit  ← you review and apply
```

The AI agent reads context automatically via MCP. When it learns something new, it stages a change. You review and commit — just like code.

## Key features

- **15+ CLI commands** for complete context lifecycle management
- **MCP server** compatible with Cursor, Claude Code, VS Code, and OpenCode
- **Three context layers** — project, codebase, rules — injected within a token budget
- **Pending diff model** — all AI changes are staged for your review before applying
- **Local-first** — no cloud, no accounts, no API keys required
- **Git-backed** — every context change is a commit you can restore

## Compatibility

| Editor | Support |
|---|---|
| Cursor | Full MCP + flat file export |
| Claude Code | Full MCP + `CLAUDE.md` export |
| VS Code (Copilot) | MCP via `.vscode/mcp.json` |
| OpenCode | Full MCP |
| Any editor | `AGENTS.md` / `.cursorrules` flat export |

## Next steps

- [Quick Start](/quick-start) — get running in 5 minutes
- [How It Works](/how-it-works) — deep dive into the three-layer model
- [CLI Reference](/cli/overview) — all commands documented
