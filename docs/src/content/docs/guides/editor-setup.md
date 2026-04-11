---
title: Editor Setup
description: Step-by-step MCP configuration for Cursor, Claude Code, VS Code, and OpenCode.
---

## Quick setup (any editor)

```bash
mexai connect --editor <editor>
```

Restart your editor and you're done. For detailed per-editor steps, see below.

---

## Cursor

### Automatic

```bash
mexai connect --editor cursor
```

Writes to `~/.cursor/mcp.json`.

### Manual

Edit `~/.cursor/mcp.json`:

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

### Verifying

1. Restart Cursor
2. Open a project that has `mexai.json`
3. Ask the agent: *"Read my mexai context"*
4. You should see your project identity and current state

---

## Claude Code

### Automatic

```bash
mexai connect --editor claude-code
```

Writes to `~/.claude/mcp.json`.

### Manual

Edit `~/.claude/mcp.json`:

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

Claude Code also reads `CLAUDE.md` from your project root. Export it for sessions where MCP isn't active:

```bash
mexai export --dir .
```

---

## VS Code (with Copilot)

### Automatic

```bash
mexai connect --editor vscode
```

Writes to `.vscode/mcp.json` in the current directory.

### Manual

Create `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "mexai": {
      "type": "stdio",
      "command": "mexai",
      "args": ["serve"]
    }
  }
}
```

---

## OpenCode

### Automatic

```bash
mexai connect --editor opencode
```

Writes to `~/.opencode/mcp.json`.

### Manual

Edit `~/.opencode/mcp.json`:

```json
{
  "mcp": {
    "mexai": {
      "type": "local",
      "command": ["mexai", "serve"]
    }
  }
}
```

---

## Flat file fallback

For editors that don't support MCP, export flat context files:

```bash
mexai export
```

This writes `AGENTS.md`, `CLAUDE.md`, and `.cursorrules` to the current directory. Many editors automatically read these files.

Re-run after every `mexai commit` to keep them in sync.

---

## Troubleshooting

**MCP not connecting:**
- Make sure `mexai` is in your PATH: `which mexai`
- Check `mexai serve --debug` for verbose output
- Restart your editor completely (not just reload)

**Wrong project detected:**
- Make sure `mexai.json` exists in your project root: `ls mexai.json`
- If missing: `mexai link <slug>` to recreate it

**No context loaded:**
- Check `mexai status` to confirm the project has content
- Run `mexai validate` to check for issues
