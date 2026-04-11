---
title: Quick Start
description: Get mexai running in your project in under 5 minutes.
---

## Prerequisites

- Node.js 20+
- pnpm 9+ (or npm/yarn)

## Install

```bash
npm install -g mexai
```

Or with pnpm:

```bash
pnpm add -g mexai
```

## Set up your project

<Steps>

1. **Navigate to your project directory**

   ```bash
   cd /path/to/your/project
   ```

2. **Initialise mexai**

   ```bash
   mexai init
   ```

   This launches an interactive wizard that asks for your project name, domain, stack, and a brief description. It creates a context store at `~/.mexai/projects/<slug>/` and writes `mexai.json` to your project root for auto-detection.

3. **Scan your codebase**

   ```bash
   mexai map
   ```

   Scans your project and generates a draft `codebase.md` with detected frameworks, structure, and conventions. Review and edit it:

   ```bash
   mexai edit --layer codebase
   ```

4. **Connect to your AI editor**

   ```bash
   mexai connect --editor cursor
   # or
   mexai connect --editor claude-code
   # or
   mexai connect --editor all
   ```

   This writes the MCP configuration to your editor's config file so it picks up mexai on the next restart.

5. **Restart your editor**

   Restart Cursor / Claude Code / VS Code. The MCP server starts automatically. Your AI agent now has access to your full project context on every session.

</Steps>

## Verify it's working

```bash
mexai status
```

You should see your project name, the current state, and `● CLEAN` (no pending changes).

## Your first context save

After a session where your AI agent makes decisions, it should call `context_save` automatically via MCP. You can also do it manually:

```bash
mexai context-save \
  --message "Switch to Zod v4 for validation" \
  --decisions '[{"title":"Use Zod v4","rationale":"Better performance and smaller bundle size"}]' \
  --current-state "Migrating validation layer to Zod v4"
```

Then review and commit:

```bash
mexai diff     # see what changed
mexai commit   # apply it
```

## Non-interactive mode (CI)

For CI environments, use the `--yes` flag:

```bash
mexai init --yes --name "my-project" --domain api --stack "TypeScript,Node.js"
```

## Next steps

- [How It Works](/how-it-works) — understand the three-layer model
- [CLI Reference](/cli/overview) — full command documentation
- [MCP Integration](/mcp/overview) — what your AI agent can do
- [Editor Setup](/guides/editor-setup) — per-editor configuration details
