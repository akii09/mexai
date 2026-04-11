---
title: codebase_read
description: Read the codebase map — key files, conventions, patterns, and structure.
---

Returns the codebase map for a project. Agents use this when they need to understand file organisation, conventions, or patterns beyond the summary in the project context.

## Input schema

```typescript
{
  workspacePath?: string   // path to project directory
  slug?: string            // explicit project slug
  section?: string         // "all" | "keyFiles" | "conventions" | "structure" | "patterns" | "doNotTouch"
}
```

`section` defaults to `"all"` — returns the full formatted codebase map.

## Output

```json
{
  "success": true,
  "slug": "my-api",
  "name": "My API",
  "section": "all",
  "content": "## Key Files\n\n...\n\n## Conventions\n\n...",
  "tokensUsed": 312
}
```

## Section filtering

To get only a specific section:

```json
{
  "workspacePath": "/path/to/project",
  "section": "keyFiles"
}
```

Available sections:
- `all` — full codebase map
- `keyFiles` — important files and their purposes
- `conventions` — naming and organisation rules
- `structure` — directory tree
- `patterns` — recurring code patterns
- `doNotTouch` — files that must not be modified

## Error responses

| Error code | Meaning |
|---|---|
| `LAYER_NOT_INITIALIZED` | `codebase.md` doesn't exist — run `mexai map` |
| `NO_ACTIVE_PROJECT` | Project not found |
| `STORE_ERROR` | Filesystem error |
