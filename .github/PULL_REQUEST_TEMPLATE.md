## What

<!-- One sentence: what does this PR do? -->

## Why

<!-- Why is this change needed? Link to issue if applicable. Fixes #123 -->

## How

<!-- Brief description of the approach. For non-obvious decisions, explain why this way vs alternatives. -->

## Testing

<!-- How did you verify this works? -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated (if I/O is involved)
- [ ] Tested manually: `pnpm build && pnpm test`

## Checklist

- [ ] Types are in `packages/core/src/types.ts`
- [ ] Schemas are in `packages/core/src/schemas.ts`
- [ ] No `any` in new code
- [ ] Exported functions have JSDoc
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] Changeset written (`pnpm changeset`) — skip only for docs/tooling changes
- [ ] Commit follows conventional format: `type(scope): description`

## Breaking Changes

<!-- Does this change the public API of @mexai/core, the CLI interface, or MCP tool schemas? If yes, describe what breaks and the migration path. -->

None / [describe here]