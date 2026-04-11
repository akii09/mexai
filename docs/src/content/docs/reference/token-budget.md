---
title: Token Budget
description: How mexai manages context size to stay within AI model context windows.
---

mexai injects context within a configurable token ceiling. This ensures your context never bloats beyond what's useful for an AI model.

## Default budget

The default total ceiling is **700 tokens** across all three layers.

Per-layer allocation (approximate):

| Layer | Default ceiling | Priority |
|---|---|---|
| Rules | 150 tokens | Highest — never truncated |
| Context | 300 tokens | High — identity/state never cut |
| Codebase | 250 tokens | Medium — structure cut first |

## Token estimation

mexai uses a simple heuristic: **1 token ≈ 4 characters**. This is conservative (avoids underestimating) and works well with tiktoken-based models.

```
estimateTokens(text) = Math.ceil(text.length / 4)
```

## Truncation rules

When a layer exceeds its budget ceiling, content is removed in priority order:

### Context layer (Layer 1)

1. Resolved open threads removed first
2. Oldest decisions removed (newest preserved)
3. Oldest unresolved threads removed
4. **Identity and current state are never removed**

### Codebase layer (Layer 2)

1. Deepest directory levels in Structure removed first
2. Oldest patterns removed
3. **Key Files and Conventions are never removed**

### Rules layer (Layer 3)

Rules are **never truncated**. If rules exceed the budget, a warning is logged:

```
! Rules layer (180 tokens) exceeds ceiling (150 tokens). 
  Consider trimming your rules.md.
```

## Injection order

The final injection payload is assembled in this order:

```
1. Rules        ← highest priority, first in context
2. Context      ← project identity and state
3. Codebase     ← file map and conventions
```

This means if the total budget is exceeded, codebase content is cut before context, and context before rules.

## Configuring the budget

Token budget configuration will be available in `~/.mexai/config.json` in a future release. Currently uses the defaults above.

## `maxTokens` per request

The `context_read` MCP tool accepts a `maxTokens` parameter to override the ceiling for a specific call:

```json
{
  "workspacePath": "/path/to/project",
  "maxTokens": 1000
}
```

Use this when you know the model has headroom and want more context injected.

## Checking token usage

`context_read` returns token usage in its response:

```json
{
  "tokensUsed": 487,
  "layerBreakdown": {
    "rules": 120,
    "context": 210,
    "codebase": 157
  }
}
```

Use this to tune your context content and stay efficiently within budget.
