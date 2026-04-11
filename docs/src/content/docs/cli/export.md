---
title: mexai export
description: Export flat context files — AGENTS.md, CLAUDE.md, and .cursorrules — to the project directory.
---

Generates flat context files from the project store and writes them to the project directory. For AI editors that don't support MCP and read flat files instead.

## Usage

```bash
mexai export [options]
```

## Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `--dir <path>` | Output directory (defaults to current directory) |
| `--json` | Output as JSON with completeness audit |

## Files generated

| File | Format | Used by |
|---|---|---|
| `AGENTS.md` | Generic agent context | Any AI editor |
| `CLAUDE.md` | Claude-specific format | Claude Code, Claude.ai |
| `.cursorrules` | Cursor format | Cursor |

All three files include:
- Agent rules (from `rules.md`)
- Project identity and current state
- All architectural decisions (full list, never truncated)

## Completeness audit

After generating, mexai shows a completeness report:

```
mexai export

  ✓  AGENTS.md
  ✓  CLAUDE.md
  !  .cursorrules

Completeness:
  ✓  Identity
  ✓  Current State
  ○  Decisions  (not yet added — run mexai context-save or mexai edit)
  ✓  Rules

Some sections are missing. Add them to improve AI context quality.

These files are generated — edit your context via  mexai edit  instead.
Re-run  mexai export  after committing a diff to regenerate them.
```

## JSON output

```bash
mexai export --json
```

```json
{
  "slug": "my-api",
  "name": "My API",
  "outputDir": "/path/to/project",
  "files": ["AGENTS.md", "CLAUDE.md", ".cursorrules"],
  "completeness": [
    {
      "target": "AGENTS.md",
      "hasRules": true,
      "hasIdentity": true,
      "hasCurrentState": true,
      "hasDecisions": false,
      "complete": false
    }
  ],
  "allComplete": false
}
```

## Important notes

- These files are **generated** — don't edit them directly. Edit your context layers via `mexai edit` and re-run `mexai export`.
- Re-run `mexai export` after every `mexai commit` to keep the flat files in sync with your store.
- If you use MCP, you don't need these files — they're a fallback for non-MCP editors.
