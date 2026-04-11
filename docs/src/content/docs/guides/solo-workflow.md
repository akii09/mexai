---
title: Solo Developer Workflow
description: The recommended day-to-day workflow for a solo developer using mexai.
---

This is the recommended workflow for a solo developer using mexai with an AI editor like Cursor or Claude Code.

## One-time setup

```bash
# 1. Install mexai
npm install -g mexai

# 2. Navigate to your project
cd /path/to/my-project

# 3. Initialise
mexai init

# 4. Review and refine the codebase map
mexai edit --layer codebase

# 5. Configure your editor
mexai connect --editor cursor   # or claude-code, vscode, etc.

# 6. Restart your editor
```

## Daily workflow

### Starting a session

Open your project in your editor. Your AI agent automatically reads the project context via MCP. No prompting needed.

You can verify by asking the agent: *"What project am I in? What's the current state?"*

### During the session

Work normally. Your agent has full context of:
- What you're building
- Key architectural decisions already made
- File conventions and patterns to follow
- Code quality rules

When the agent learns something new (a decision you made, a state change, a new open thread), it calls `context_save` to stage it.

### End of session

```bash
mexai diff     # see what the agent staged
mexai commit   # apply it (or mexai diff --discard to throw away)
```

That's it. The context is committed to git with a full history.

### Checking status

```bash
mexai status
```

Shows the current state: `● CLEAN`, `● STAGED`, or `● DIRTY`.

## Manually adding decisions

Sometimes you make a decision without the agent noticing. Add it directly:

```bash
mexai context-save \
  --message "Switched to Prisma" \
  --decisions '[{"title":"Use Prisma ORM","rationale":"Better TypeScript integration than raw SQL for this use case"}]'

mexai commit
```

Or open the context file directly:

```bash
mexai edit --layer context
```

## Reviewing history

```bash
mexai log         # see all context commits
mexai log -n 5    # last 5
```

## Rolling back

```bash
mexai log          # find the hash you want
mexai restore abc1234
```

## Keeping the codebase map fresh

After major refactors:

```bash
mexai map            # regenerate the draft
mexai edit --layer codebase    # review and update
```

## Tips

- **Commit context after every meaningful session** — don't let `pending-diff.json` accumulate too long
- **Review before committing** — `mexai diff` is fast, and it's your last chance to catch AI mistakes
- **Use `mexai apply` for small, obvious changes** — skip the diff step when you're confident
- **Keep rules.md updated** — the more specific your rules, the more consistent your agent's output
