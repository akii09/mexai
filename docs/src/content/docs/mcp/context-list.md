---
title: context_list
description: List all registered mexai projects.
---

Returns a list of all projects registered in the mexai store. Useful for agents that need to know which projects are available.

## Input schema

```typescript
{}  // no input required
```

## Output

```json
{
  "success": true,
  "projects": [
    {
      "slug": "my-api",
      "name": "My API",
      "path": "/path/to/my-api",
      "active": true,
      "status": "active",
      "hasPendingDiff": false
    },
    {
      "slug": "other-project",
      "name": "Other Project",
      "path": "/path/to/other",
      "active": false,
      "status": "active",
      "hasPendingDiff": true
    }
  ],
  "count": 2
}
```

## Fields

| Field | Description |
|---|---|
| `slug` | Unique project identifier |
| `name` | Human-readable project name |
| `path` | Path to the registered project directory |
| `active` | Whether this is the currently active project |
| `status` | Project status from frontmatter (`active`, `archived`, `on-hold`) |
| `hasPendingDiff` | Whether there are staged changes waiting to be committed |
