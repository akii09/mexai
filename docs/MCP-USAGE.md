# Mexai MCP Server — Usage Guide

The Mexai MCP server exposes your project context, codebase map, and agent rules to any AI editor that supports the [Model Context Protocol](https://modelcontextprotocol.io). Once connected, the editor's AI can read and update your project knowledge without you having to paste any context manually.

---

## Prerequisites

1. At least one project initialized: `mexai init`
2. Active project set: `mexai load <slug>`
3. Mexai CLI installed (v0.1.0+)

---

## Starting the Server

```bash
mexai serve
```

The server communicates over **stdio** — it does not bind to any port. Your AI editor manages the process lifecycle.

Add `--debug` to see startup and connection logs printed to stderr:

```bash
mexai serve --debug
```

---

## Connecting Your Editor

Configure the MCP server in your editor by pointing it at `mexai serve`. The editor will spawn the process and communicate over stdin/stdout automatically.

### Cursor

Open **Settings → MCP** (or `.cursor/mcp.json` in your project root):

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

### Claude Code (claude.ai / Claude Desktop)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

### VS Code (GitHub Copilot / Continue)

Add to your VS Code `settings.json`:

```json
{
  "mcp.servers": {
    "mexai": {
      "command": "mexai",
      "args": ["serve"]
    }
  }
}
```

Or in `.vscode/mcp.json` inside your workspace:

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

### OpenCode

Add to your `opencode.json`:

```json
{
  "mcp": {
    "mexai": {
      "command": "mexai",
      "args": ["serve"]
    }
  }
}
```

### Using `npx` (no global install)

If you haven't installed mexai globally, use `npx`:

```json
{
  "command": "npx",
  "args": ["-y", "mexai", "serve"]
}
```

---

## Available Tools

The server registers five tools. AI agents call these automatically when they need project context.

### `context_read`

Returns the full context injection payload (context, codebase map, rules) for the active or specified project.

| Parameter | Type | Description |
|---|---|---|
| `workspacePath` | `string` (optional) | Absolute path to project root — auto-detects via registry |
| `slug` | `string` (optional) | Project slug. Takes priority over `workspacePath`. |
| `layers` | `string[]` (optional) | Which layers to include: `context`, `codebase`, `rules`. Defaults to all three. |
| `maxTokens` | `number` (optional) | Override the token ceiling from config. |

### `context_save`

Stage proposed context changes for developer review. Writes to `pending-diff.json`. Changes are applied only after the developer runs `mexai diff` + `mexai commit`.

| Parameter | Type | Description |
|---|---|---|
| `workspacePath` | `string` (optional) | Absolute path to project root |
| `slug` | `string` (optional) | Project slug |
| `source` | `string` | Which AI tool is making the save (e.g. `cursor`, `claude`, `copilot`) |
| `commitMessage` | `string` | Short summary — max 72 characters |
| `sessionNote` | `string` (optional) | What happened in this session |
| `changes.decisions` | `array` (optional) | Architectural decisions to record |
| `changes.openThreads` | `array` (optional) | Threads to add or resolve |
| `changes.currentState` | `string` (optional) | Fresh description of current development state |

### `codebase_read`

Returns the codebase map or a specific section of it.

| Parameter | Type | Description |
|---|---|---|
| `workspacePath` | `string` (optional) | — |
| `slug` | `string` (optional) | — |
| `section` | `string` | `all` \| `structure` \| `keyFiles` \| `conventions` \| `patterns` \| `doNotTouch`. Default: `all`. |

### `rules_read`

Returns the full agent rules file for the project. Never truncated.

| Parameter | Type | Description |
|---|---|---|
| `workspacePath` | `string` (optional) | — |
| `slug` | `string` (optional) | — |

### `context_list`

Lists all projects in the mexai store with their name, slug, path, status, and which is currently active.

No input parameters.

---

## Available Resources

Resources are passively readable by editors that support MCP resource fetching. They update every time you commit a context change.

| URI | Content | Token ceiling |
|---|---|---|
| `mexai://context` | Layer 1 — identity, current state, decisions, open threads | 250 |
| `mexai://codebase` | Layer 2 — structure, key files, conventions, patterns | 300 |
| `mexai://rules` | Layer 3 — code quality gates, security rules, consistency | 150 |
| `mexai://all` | All three layers combined | 700 |

---

## Typical AI Workflow

```
Editor opens project
  └─ AI calls context_read({ workspacePath: "/path/to/project" })
       └─ Returns ~500–700 tokens of structured context

AI session ends
  └─ AI calls context_save({
       source: "cursor",
       commitMessage: "Add login flow decisions",
       changes: {
         decisions: [{ title: "JWT over sessions", rationale: "stateless API" }],
         currentState: "Auth module 80% complete"
       }
     })

Developer reviews
  └─ mexai diff       ← shows what the AI proposed
  └─ mexai commit     ← applies to versioned store
```

---

## Troubleshooting

### `Could not locate @mexai/mcp server binary`

The CLI cannot find `dist/server.cjs` in the expected locations. Fix:

```bash
# In the monorepo (development)
pnpm --filter @mexai/mcp build

# Installed globally
npm install -g mexai   # or pnpm add -g mexai
```

### Server starts but editor shows no tools

1. Confirm the active project is set: `mexai list`
2. If nothing is active, run `mexai load <slug>`
3. Restart the MCP server in your editor after changing the active project

### `No active project` returned by a resource

Run `mexai load <slug>` to set an active project, then reconnect the MCP server.

### Debug mode

```bash
mexai serve --debug
```

Writes startup and connection events to stderr. Your editor typically surfaces these in its MCP debug panel or output log.
