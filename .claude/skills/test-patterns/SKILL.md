# Skill: Test Patterns

> Reference for writing tests in this codebase. Read this before writing any test.

---

## The Three Rules

1. **Co-locate tests** — `diff-engine.ts` and `diff-engine.test.ts` live in the same directory. No `__tests__/` folders anywhere.

2. **Unit tests mock I/O** — no test in `@mexai/core` touches the real `~/.mexai/`. Use tmp directories or mock the StoreManager.

3. **Integration tests clean up** — every integration test that creates a tmp directory removes it in `afterEach`. No leftover test artifacts.

---

## Unit Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DiffEngine } from './diff-engine.js'

describe('DiffEngine', () => {
  let engine: DiffEngine

  beforeEach(() => {
    engine = new DiffEngine()
  })

  describe('build', () => {
    it('produces correct PendingDiff structure', () => {
      const diff = engine.build(
        {
          decisions: [{ title: 'Chose Vitest', reason: 'ESM-native' }],
        },
        'cursor'
      )

      expect(diff.sources).toEqual(['cursor'])
      expect(diff.layerChanges.context?.decisions).toHaveLength(1)
      expect(diff.preview.decisionsAdded).toBe(1)
    })
  })

  describe('merge', () => {
    it('appends decisions from concurrent saves', () => {
      const first = engine.build(
        { decisions: [{ title: 'First', reason: 'reason' }] },
        'cursor'
      )
      const merged = engine.merge(
        first,
        { decisions: [{ title: 'Second', reason: 'reason' }] },
        'claude-code'
      )

      expect(merged.layerChanges.context?.decisions).toHaveLength(2)
      expect(merged.sources).toEqual(['cursor', 'claude-code'])
    })
  })
})
```

---

## Integration Test Pattern (Tmp Filesystem)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { StoreManager } from './store-manager.js'

describe('StoreManager integration', () => {
  let tmpDir: string
  let store: StoreManager

  beforeEach(async () => {
    // Create isolated tmp directory for each test
    tmpDir = await mkdtemp(join(tmpdir(), 'mexai-test-'))
    store = new StoreManager(tmpDir)   // inject path — never use real ~/.mexai/
    await store.ensureStore()
  })

  afterEach(async () => {
    // Always clean up — no leftover test state
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('creates project directory structure on init', async () => {
    await store.initProject('My Project', { stack: ['TypeScript'] })

    const project = await store.getProject('my-project')
    expect(project.slug).toBe('my-project')
  })
})
```

---

## Mocking simple-git

For unit tests of `GitWrapper` that should not touch real git:

```typescript
import { vi } from 'vitest'

vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue({ commit: 'abc1234' }),
    log: vi.fn().mockResolvedValue({
      all: [
        {
          hash: 'abc1234def5678',
          message: 'mexai: test commit',
          date: '2026-04-08T10:00:00Z',
        },
      ],
    }),
    checkout: vi.fn().mockResolvedValue(undefined),
  })),
}))
```

---

## Mocking StoreManager in CLI Tests

CLI commands call StoreManager — mock it so CLI tests don't touch disk:

```typescript
import { vi } from 'vitest'
import type { StoreManager } from '@mexai/core'

const mockStore = {
  resolveProject: vi.fn().mockResolvedValue('my-project'),
  getProject: vi.fn().mockResolvedValue({
    slug: 'my-project',
    name: 'My Project',
    status: 'active',
  }),
  readLayer: vi.fn().mockResolvedValue('# context content'),
  readPendingDiff: vi.fn().mockResolvedValue(null),
} satisfies Partial<StoreManager>
```

---

## Test Naming Convention

```
describe('ClassName')
  describe('methodName')
    it('does specific thing in specific scenario')
    it('returns error when condition is missing')
    it('handles edge case: empty array input')
```

Not:
```
it('works')           ✗ — too vague
it('test 1')          ✗ — meaningless
it('should do thing') ✗ — drop "should"
```

---

## What to Test in Each Package

### `@mexai/core`

- Every pure function: unit test
- StoreManager: integration tests with tmp filesystem
- DiffEngine: unit tests for every merge rule (see diff-engine-skill.md)
- CodebaseScanner: unit tests with mocked filesystem via `memfs` or `mock-fs`
- GitWrapper: unit tests with mocked simple-git
- InjectionComposer: unit tests — verify token budgets are respected

### `mexai` (cli)

- Each command handler: unit tests with mocked StoreManager
- `resolveProject` error paths: ensure correct error messages surface
- Output formatting: snapshot tests for diff display

### `@mexai/mcp`

- Each tool: integration tests via subprocess spawn (see mcp-tool-skill.md)
- Resolution logic: unit tests for all four resolution steps
- Error responses: typed codes returned, not throws

---

## Coverage Thresholds

`@mexai/core` enforces minimum coverage (configured in `vitest.config.ts`):

```
lines:      80%
functions:  80%
branches:   75%
statements: 80%
```

The diff engine should be significantly above threshold — aim for 95%+ on that module specifically.