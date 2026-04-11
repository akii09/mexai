---
title: mexai connect
description: Configure MCP for your AI editor and optionally export flat context files.
---

Writes mexai's MCP server configuration to your AI editor's config file. After a restart, your editor will automatically read your project context on every session.

## Usage

```bash
mexai connect [options]
```

## Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `--editor <editor>` | Editor to configure (see below) |
| `--export-files` | Also write flat files (AGENTS.md, CLAUDE.md, .cursorrules) |

## Supported editors

| Value | Config location |
|---|---|
| `cursor` | `~/.cursor/mcp.json` |
| `claude-code` | `~/.claude/mcp.json` |
| `vscode` | `.vscode/mcp.json` in current directory |
| `opencode` | `~/.opencode/mcp.json` |
| `all` | All of the above |

## Examples

Configure for Cursor:
```bash
mexai connect --editor cursor
```

Configure for Claude Code:
```bash
mexai connect --editor claude-code
```

Configure for all editors at once:
```bash
mexai connect --editor all
```

With flat file export (for editors that read files instead of MCP):
```bash
mexai connect --editor all --export-files
```

## What it writes

mexai merges its entry into your existing MCP config — it never overwrites other entries.

Example entry added to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "mexai": {
      "command": "mexai",
      "args": ["serve"]
    }
  }
}
```

## After connecting

1. **Restart your editor** to pick up the new MCP config
2. Open a project directory that has `mexai.json`
3. Your AI agent will now call `context_read` automatically on session start

Verify MCP is connected by asking your agent: *"What project am I in? Read my mexai context."*

## Flat file export

The `--export-files` flag writes three files to your project root:

- `AGENTS.md` — context for any agent (generic format)
- `CLAUDE.md` — Claude-specific format
- `.cursorrules` — Cursor-specific format

These are useful for editors that don't support MCP or as a fallback. See [`mexai export`](/cli/export) for more details.
