---
title: context_read
description: Read all context layers for a project — the primary tool for agent session startup.
---

Reads the project context and returns it formatted for injection into an AI session. This is the tool agents call at the start of every session to load project context.

## Input schema

```typescript
{
  workspacePath?: string   // path to project directory (auto-detects via mexai.json)
  slug?: string            // explicit project slug (overrides workspacePath)
  layers?: string[]        // which layers to include: "context" | "codebase" | "rules"
  maxTokens?: number       // token ceiling (default: from project config)
}
```

All fields are optional. If neither `workspacePath` nor `slug` is provided, mexai uses the active project.

## Output

```json
{
  "success": true,
  "slug": "my-api",
  "name": "My API",
  "content": "# Agent Rules\n\n...\n\n# Project Context\n\n...\n\n# Codebase\n\n...",
  "tokensUsed": 487,
  "layerBreakdown": {
    "rules": 120,
    "context": 210,
    "codebase": 157
  }
}
```

## Injection order

Content is assembled in this order:
1. **Rules** (Layer 3) — agent behaviour rules, highest priority
2. **Context** (Layer 1) — project identity, state, decisions
3. **Codebase** (Layer 2) — file map, conventions, patterns

## Layer filtering

To request specific layers:

```json
{
  "workspacePath": "/path/to/project",
  "layers": ["context", "rules"]
}
```

## Token budget

mexai stays within the `maxTokens` ceiling using per-layer truncation:

- Rules: never truncated (budget warning if over)
- Context: oldest decisions removed first
- Codebase: deepest directory levels removed first

## Error responses

| Error code | Meaning |
|---|---|
| `NO_ACTIVE_PROJECT` | No project found for the given path/slug |
| `LAYER_NOT_INITIALIZED` | A requested layer file doesn't exist yet |
| `STORE_ERROR` | Unexpected filesystem error |

## Example usage (agent prompt)

An agent system prompt might include:

```
At the start of every session, call context_read with the current 
workspacePath to load the project context. Use this context to 
inform all your responses.
```
