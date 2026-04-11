---
title: mexai map
description: Scan the codebase and generate or update codebase.md.
---

Scans the current project's codebase and generates a structured `codebase.md` draft. Detects frameworks, test runners, styling solutions, and directory structure without any AI or API calls.

## Usage

```bash
mexai map [options]
```

## Options

| Flag | Description |
|---|---|
| `-p, --project <slug>` | Project slug (defaults to auto-detected project) |
| `--quality <mode>` | Quality gate: `standard` (default) or `strict` |
| `--json` | Output as JSON (machine-readable) |

## Quality modes

### Standard (default)

Generates a new `codebase.md` draft regardless of the current file's state. Use this when starting fresh or after major structural changes.

```bash
mexai map
```

### Strict

Validates the *existing* `codebase.md` before regenerating. Fails if any of the following sections are empty or contain only placeholder text:

- Key Files
- Conventions
- Patterns
- Do Not Touch

```bash
mexai map --quality strict
```

Strict mode is useful in CI to enforce that your codebase map is kept up to date.

## What it detects

**Frameworks:**
- Next.js, Vite, Express, Remix, Astro (from `package.json` deps + config files)

**Test runners:**
- Vitest, Jest (from `devDependencies`)

**Styling:**
- Tailwind CSS, CSS Modules, styled-components

**TypeScript:**
- Detects `tsconfig.json`, strict mode flags

**Structure:**
- Directory tree (3 levels, excludes `node_modules`, `.git`, `dist`, `build`, `.next`, `.turbo`, `coverage`)

## JSON output

```bash
mexai map --json
```

```json
{
  "slug": "my-project",
  "name": "My Project",
  "root": "/path/to/project",
  "frameworks": ["next"],
  "hasTypeScript": true,
  "testFrameworks": ["vitest"],
  "styling": ["tailwind"],
  "quality": "standard",
  "qualityPassed": true,
  "qualityIssues": []
}
```

## After mapping

The generated `codebase.md` is a **draft** — it marks clearly what was auto-detected and leaves sections like Patterns and Do Not Touch as stubs for you to fill in.

```bash
mexai edit --layer codebase   # review and fill in the stubs
mexai commit                  # or mexai diff first if you staged changes
```

## Re-scanning

Run `mexai map` again whenever your project structure changes significantly. It overwrites the existing `codebase.md`, so make sure you've committed any manual edits first.
