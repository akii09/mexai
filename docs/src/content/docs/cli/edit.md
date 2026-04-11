---
title: mexai edit
description: Open a context layer file in your editor or write it non-interactively.
---

Opens a context layer file (`context.md`, `codebase.md`, or `rules.md`) in `$EDITOR` for manual editing. Supports non-interactive modes for scripting.

## Usage

```bash
mexai edit [options]
```

## Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `--layer <layer>` | Layer to edit: `context`, `codebase`, `rules` (default: `context`) |
| `--from-file <path>` | Write content from a file to the layer (non-interactive) |
| `--stdin` | Read content from stdin and write to the layer (non-interactive) |
| `--print-path` | Print the file path and exit (for scripting) |
| `--json` | Output operation result as JSON |

## Examples

Open the context layer in `$EDITOR`:

```bash
mexai edit
mexai edit --layer context
```

Open the codebase map:

```bash
mexai edit --layer codebase
```

Write from a file:

```bash
mexai edit --layer rules --from-file ./my-rules.md
```

Write from stdin:

```bash
cat my-rules.md | mexai edit --layer rules --stdin
```

Get the file path for scripting:

```bash
CONTEXT_PATH=$(mexai edit --print-path)
vim "$CONTEXT_PATH"
```

## Editor detection

mexai uses `$EDITOR` environment variable, falling back to `$VISUAL`, then `vi`.

```bash
EDITOR=code mexai edit      # VS Code
EDITOR=nvim mexai edit      # Neovim
EDITOR=nano mexai edit      # Nano
```

## After editing

mexai runs `mexai validate` automatically after the editor closes and reports any frontmatter issues:

```
✓  context.md frontmatter is valid
```

or:

```
!  context.md has frontmatter issues:
     missing required field: domain
   Run  mexai doctor --apply  to auto-repair.
```

## JSON output

```bash
mexai edit --layer context --from-file ./update.md --json
```

```json
{
  "slug": "my-api",
  "layer": "context",
  "filePath": "/Users/you/.mexai/projects/my-api/context.md",
  "action": "written",
  "success": true,
  "valid": true,
  "validationErrors": null
}
```

## Notes

- Direct edits via `mexai edit` bypass the pending diff model — changes are written directly to the layer file
- Run `mexai commit` after editing to ensure the store's git history captures the change (or mexai doctor --apply will do it for frontmatter repairs)
- Prefer `mexai context-save` for adding decisions and state updates — it uses the proper staging pipeline
