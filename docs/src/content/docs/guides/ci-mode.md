---
title: CI / Non-Interactive Mode
description: Using mexai in CI pipelines and automated scripts without prompts.
---

mexai supports fully non-interactive operation for use in CI pipelines, Docker builds, and automated scripts.

## Non-interactive init

The `--yes` flag skips all interactive prompts:

```bash
mexai init --yes \
  --name "my-project" \
  --domain "api" \
  --stack "TypeScript,Node.js" \
  --identity "REST API for subscription management" \
  --current-state "Initial setup"
```

**Idempotent:** Safe to run on every CI run. If `mexai.json` already exists, it skips silently. If the project slug already exists, it links and exits.

## Non-interactive context operations

```bash
# Stage a decision
mexai context-save \
  --message "CI: note deployment target" \
  --decisions '[{"title":"Deploy to Railway","rationale":"Simpler than ECS for this scale"}]'

# Stage + commit atomically
mexai apply \
  --message "CI: update current state" \
  --current-state "Running integration tests on PR #42"

# Validate project integrity
mexai validate

# Export flat files (no prompts)
mexai export --json
```

## JSON output for scripting

All major commands support `--json` for machine-readable output:

```bash
STATUS=$(mexai status --json)
STATE=$(echo $STATUS | jq -r '.state')

if [ "$STATE" = "staged" ]; then
  echo "Pending diff found — committing..."
  mexai commit --json
fi
```

## Map with quality gate

Enforce that the codebase map is kept up to date:

```bash
mexai map --quality strict --json
```

Exits with code `1` if any sections are empty or placeholder-only.

## Example CI workflow

```yaml
# .github/workflows/context-check.yml
name: mexai context check

on: [push]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install mexai
        run: npm install -g mexai

      - name: Init (idempotent)
        run: |
          mexai init --yes \
            --name "${{ github.repository }}" \
            --stack "TypeScript"

      - name: Validate context
        run: mexai validate

      - name: Check codebase map quality
        run: mexai map --quality strict --json
```

## Exit codes

All commands use standard exit codes:

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Error or validation failure |

`process.exitCode = 1` is set on failure — the process exits cleanly after completing output.

## Environment considerations

- mexai stores data in `~/.mexai/` — ensure this directory persists across runs if you need continuity
- For ephemeral CI environments, use `mexai init --yes` on each run (it's idempotent)
- The `GITHUB_TOKEN` env var is required for `mexai sync init`
