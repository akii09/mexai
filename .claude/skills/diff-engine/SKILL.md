# Skill: Diff Engine

> Reference for any AI agent working on `packages/core/src/diff/`

---

## What It Does

The diff engine manages the full lifecycle of a pending diff — the staged set of AI-proposed changes awaiting developer review. It is the most critical module in the codebase. Every change to it requires tests for every affected merge rule.

---

## The Three Operations

### `build(proposed, source): PendingDiff`

Creates a fresh `PendingDiff` from a `ProposedChanges` object. Called when there is no existing pending diff for a project.

```typescript
const diff = engine.build({
  decisions: [{ title: 'Chose Vitest', reason: 'ESM-native', ruledOut: 'Jest' }],
  openThreads: [{ action: 'add', content: 'Document test patterns' }],
  currentState: 'Setting up test infrastructure',
}, 'cursor')
```

### `merge(existing, incoming, source): PendingDiff`

Called when a second AI save happens before the developer has committed the first. Merges the incoming changes into the existing pending diff using the rules below.

### `apply(current, diff): ApplyResult`

Takes the current parsed context and applies the pending diff. Returns the updated content as a string. **Never writes to disk** — that is StoreManager's job.

---

## Merge Rules (The Spec)

Every rule must have a corresponding unit test. Do not add a merge without a test.

| Field | Rule | Why |
|---|---|---|
| `decisions` | **Append** — both sets added, no dedup | Every decision is valid history |
| `openThreads` add | **Dedup by content** — same string only added once | Prevents duplicate threads |
| `openThreads` check_off + pending add | **Net-zero** — cancel both | Thread added then immediately resolved = no net change |
| `currentState` | **Last write wins** — incoming replaces existing | Only one current state makes sense |
| `sources` | **Union dedup** — unique sources only | Clean audit trail |

### Net-Zero Cancellation Detail

If an existing pending diff has `{ action: 'add', content: 'Fix auth bug' }` and the incoming has `{ action: 'check_off', content: 'Fix auth bug' }` — both are removed. The net effect is zero, which is correct.

The reverse also applies: if existing has check_off and incoming has add for the same content, both are cancelled.

---

## Test Requirements

When modifying the diff engine, tests are required for:

```
build
  ✓ produces correct PendingDiff structure
  ✓ populates preview counts correctly
  ✓ sets generatedAt to current ISO datetime
  ✓ handles empty proposed changes

merge — decisions
  ✓ appends decisions from second save
  ✓ appends decisions from third save (n saves)
  ✓ does NOT dedup decisions with same title

merge — openThreads
  ✓ deduplicates add by exact content string
  ✓ net-zero: check_off cancels pending add (same content)
  ✓ net-zero: add cancels pending check_off (same content)
  ✓ different content does not cancel

merge — currentState
  ✓ last write wins (incoming replaces existing)
  ✓ null incoming does not overwrite existing

merge — sources
  ✓ deduplicates identical sources
  ✓ unions different sources

apply
  ✓ appends decisions to ## Decisions section in correct format
  ✓ marks threads as resolved ([x]) in ## Open Threads
  ✓ adds new threads to ## Open Threads
  ✓ replaces ## Current State content
  ✓ idempotent — applying same diff twice produces same result
  ✓ does not modify frontmatter
  ✓ does not modify ## Identity section
```

---

## File Location

```
packages/core/src/diff/
├── diff-engine.ts       ← main module
├── diff-engine.test.ts  ← co-located tests
└── diff-merger.ts       ← merge rule implementations
```

---

## Common Mistakes

**Do not write to disk in apply()** — apply returns a string. StoreManager writes it.

**Do not dedup decisions** — two agents independently deciding the same thing both deserve to be in the history. Let the developer discard one during review.

**Do not auto-resolve net-zero at build time** — only at merge time. A single save that adds and checks off the same thread is a valid operation.