---
title: MCP Integration
description: How mexai's MCP server works and how to configure it for your AI editor.
---

mexai includes a Model Context Protocol (MCP) server that AI editors can connect to. Once connected, your agent automatically reads your project context on every session — no prompting, no copy-pasting.

## Starting the server

```bash
mexai serve
```

The server communicates over stdio (standard in/out), which is how all MCP editors expect it.

## Connecting your editor

Run `mexai connect` to auto-configure your editor:

```bash
mexai connect --editor cursor
mexai connect --editor claude-code
mexai connect --editor vscode
mexai connect --editor opencode
mexai connect --editor all   # configure all at once
```

This writes the MCP entry to your editor's config file. Restart your editor to activate it.

## Available tools

| Tool | Description |
|---|---|
| [`context_read`](/mcp/context-read) | Read all context layers for a project |
| [`context_save`](/mcp/context-save) | Stage context changes (decisions, state, threads) |
| [`codebase_read`](/mcp/codebase-read) | Read the codebase map |
| [`rules_read`](/mcp/rules-read) | Read agent rules |
| [`context_list`](/mcp/context-list) | List all registered projects |

## Project auto-detection

All tools accept `workspacePath` — the path to the project directory. mexai walks up from that path looking for `mexai.json` to identify the project.

When an AI editor calls `context_read`, it passes the current workspace path. mexai automatically resolves the right project.

## How agents use it

A well-configured AI agent will:

1. **On session start** — call `context_read` with the current workspace path
2. **During the session** — use the context to inform its answers
3. **When learning something new** — call `context_save` to stage the new decision or state
4. **On session end** — optionally summarise what was staged

You then run `mexai diff` and `mexai commit` to review and apply the staged changes.

## MCP config example

The config written by `mexai connect`:

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

For Cursor: `~/.cursor/mcp.json`  
For Claude Code: `~/.claude/mcp.json`  
For VS Code: `.vscode/mcp.json` in your project  
For OpenCode: `~/.opencode/mcp.json`

## Debug mode

```bash
mexai serve --debug
```

Enables verbose logging to stderr for troubleshooting MCP connection issues.
