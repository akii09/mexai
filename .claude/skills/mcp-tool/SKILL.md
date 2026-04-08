# Skill: MCP Tool Patterns

> Reference for any AI agent adding or modifying tools in `packages/mcp/src/`

---

## Every MCP Tool Follows This Pattern

```typescript
server.tool(
  'tool_name',
  'Description — be precise, agents read this to decide when to call.',
  ToolInputSchema,    // Zod schema — validated BEFORE any core call
  async (input) => {
    // 1. Resolve project
    const slug = await storeManager.resolveProject(input.workspacePath)

    // 2. Call core
    const result = await coreOperation(slug, input)

    // 3. Return typed result — never throw
    return {
      content: [{ type: 'text', text: formatResult(result) }]
    }
  }
)
```

Never skip step 1. Never throw from step 3. Never do business logic inside the handler — call core.

---

## Project Resolution (Always First)

Every tool that touches a project must resolve it via `resolveProject`. The resolution chain is:

```
1. input.workspacePath → registry prefix match
2. input.slug (explicit override — rare)
3. active project fallback
4. → McpError: NO_ACTIVE_PROJECT
```

```typescript
async function resolveFromInput(
  input: { workspacePath?: string; slug?: string },
  store: StoreManager
): Promise<string> {
  if (input.slug) return input.slug
  return store.resolveProject(input.workspacePath)
}
```

Use this helper consistently across all tools — do not inline the resolution logic.

---

## Input Schema Requirements

All tool inputs validated with Zod before any operation:

```typescript
const ContextReadSchema = z.object({
  workspacePath: z.string().optional()
    .describe('Editor workspace root — used for auto project detection'),
  slug: z.string().optional()
    .describe('Explicit project slug — overrides workspacePath if provided'),
  layers: z.array(z.enum(['context', 'codebase', 'rules'])).optional(),
  maxTokens: z.number().int().positive().default(700),
})
```

Rules:
- Every field has a `.describe()` — agents use these to understand the schema
- Use `.optional()` deliberately — `workspacePath` is optional because active project fallback exists
- Never use `z.any()` — use specific types or `z.unknown()`

---

## Error Handling

Return typed errors — never throw:

```typescript
// ✓ Correct
return {
  content: [{
    type: 'text',
    text: JSON.stringify({
      success: false,
      error: 'NO_ACTIVE_PROJECT',
      message: 'No project found for this workspace. Run `mexai init` or `mexai link`.',
    })
  }]
}

// ✗ Wrong — raw throw escapes the tool boundary
throw new Error('No project found')
```

The full set of valid error codes:

```typescript
type McpErrorCode =
  | 'NO_ACTIVE_PROJECT'
  | 'PROJECT_NOT_FOUND'
  | 'LAYER_NOT_INITIALIZED'
  | 'VALIDATION_ERROR'
  | 'STORE_ERROR'
```

Each error code maps to a specific, actionable message. Add new codes to `types.ts` before using them.

---

## Return Shape

All tools return a consistent shape:

```typescript
// Success
{
  content: [{
    type: 'text',
    text: JSON.stringify({
      success: true,
      content: '...injection payload...',
      tokensUsed: 612,
    })
  }]
}

// Failure
{
  content: [{
    type: 'text',
    text: JSON.stringify({
      success: false,
      error: 'LAYER_NOT_INITIALIZED',
      message: 'codebase.md not found. Run `mexai map` to generate it.',
    })
  }]
}
```

---

## MCP Resources

Resources are for auto-injection by editors — they don't require the agent to call a tool.

```typescript
server.resource(
  'mexai-all',
  'mexai://all',
  async () => {
    const slug = await storeManager.resolveProject()  // no workspacePath — uses active
    const payload = await injectionComposer.compose(slug, { layers: ['context', 'codebase', 'rules'], budget: defaultBudget })
    return {
      contents: [{ uri: 'mexai://all', text: payload.text, mimeType: 'text/plain' }]
    }
  }
)
```

Resources always use the active project (no workspacePath). This is correct — resource injection happens at session start before any workspace context is available.

---

## Integration Test Pattern

MCP tools are tested by spawning the server as a real subprocess:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

describe('context_read', () => {
  let client: Client

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['../../cli/dist/index.cjs', 'serve'],
    })
    client = new Client({ name: 'test', version: '1.0' }, {})
    await client.connect(transport)
  })

  afterAll(async () => {
    await client.close()
  })

  it('returns correct context for registered workspace', async () => {
    const result = await client.callTool('context_read', {
      workspacePath: tmpProjectPath,
    })
    // assert result
  })
})
```

The `testTimeout` in `mcp/vitest.config.ts` is set to 15 seconds for subprocess startup.