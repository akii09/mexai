---
title: rules_read
description: Read the agent rules for a project.
---

Returns the agent rules layer for a project. Rules define how the agent should write code — quality standards, security requirements, consistency rules, and review gates.

## Input schema

```typescript
{
  workspacePath?: string   // path to project directory
  slug?: string            // explicit project slug
}
```

## Output

```json
{
  "success": true,
  "slug": "my-api",
  "name": "My API",
  "content": "## Code Quality\n\n- Follow existing code style...\n\n## Security\n\n...",
  "tokensUsed": 145
}
```

## Notes

- Rules are **never truncated** — the full content is always returned
- A budget warning is logged if rules exceed the configured ceiling
- Rules are also included in `context_read` — use `rules_read` only when you need rules in isolation

## Error responses

| Error code | Meaning |
|---|---|
| `LAYER_NOT_INITIALIZED` | `rules.md` doesn't exist yet |
| `NO_ACTIVE_PROJECT` | Project not found |
| `STORE_ERROR` | Filesystem error |
