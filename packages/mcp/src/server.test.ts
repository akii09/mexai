/**
 * E2E integration test for the MCP server using in-memory transport.
 * Tests that all 5 tools are registered and respond correctly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createServer } from './server.js'

// Mock all @mexai/core so this test doesn't touch ~/.mexai/
vi.mock('@mexai/core', async () => {
  const { z: zod } = await import('zod')
  const MockStoreError = class extends Error {
    code: string
    constructor(code: string, msg: string) { super(msg); this.code = code }
  }
  return {
    compose: vi.fn().mockReturnValue({ text: '# context', tokensUsed: 50, layerBreakdown: { context: 30, codebase: 15, rules: 5 } }),
    resolveProject: vi.fn().mockReturnValue({ slug: 'test-project', name: 'Test Project', path: '/test' }),
    getActive: vi.fn().mockReturnValue('test-project'),
    listProjects: vi.fn().mockReturnValue([{ slug: 'test-project', name: 'Test Project', path: '/test', status: 'active', updatedAt: new Date().toISOString(), hasPendingDiff: false }]),
    readPendingDiff: vi.fn().mockReturnValue(undefined),
    writePendingDiff: vi.fn(),
    readLayer: vi.fn().mockReturnValue('# Rules\n## Code Quality\n- TypeScript strict'),
    parseCodebase: vi.fn().mockReturnValue({ structure: '## Structure', keyFiles: '', conventions: '', patterns: '', doNotTouch: '' }),
    parseRules: vi.fn().mockReturnValue({ raw: '# Rules\ncontent', codeQuality: '', security: '', consistency: '', reviewGates: '' }),
    DiffEngine: vi.fn(() => ({
      build: vi.fn().mockReturnValue({
        projectSlug: 'test-project', sources: ['cursor'], commitMessage: 'test',
        changes: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        preview: { decisionsAdded: 1, threadsAdded: 0, threadsResolved: 0, currentStateChanged: false, summary: '1 decision' }
      }),
      merge: vi.fn(),
    })),
    StoreError: MockStoreError,
    ContextSourceSchema: zod.enum(['cursor', 'claude-code', 'vscode', 'opencode', 'manual']),
    LayerSchema: zod.enum(['context', 'codebase', 'rules']),
  }
})

async function makeClient() {
  const server = createServer()
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  await client.connect(clientTransport)
  return { client, server }
}

describe('MCP server', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('lists all 5 tools', async () => {
    const { client, server } = await makeClient()
    const { tools } = await client.listTools()
    const names = tools.map(t => t.name).sort()
    expect(names).toEqual(['codebase_read', 'context_list', 'context_read', 'context_save', 'rules_read'])
    await server.close()
  })

  it('context_read returns success response', async () => {
    const { client, server } = await makeClient()
    const result = await client.callTool({ name: 'context_read', arguments: {} })
    expect(result.isError).toBeFalsy()
    const text = (result.content[0] as { type: string; text: string }).text
    const parsed = JSON.parse(text) as Record<string, unknown>
    expect(parsed.success).toBe(true)
    await server.close()
  })

  it('context_save returns staged confirmation', async () => {
    const { client, server } = await makeClient()
    const result = await client.callTool({
      name: 'context_save',
      arguments: {
        source: 'cursor',
        commitMessage: 'add decision',
        changes: { decisions: [{ title: 'Use Vitest', rationale: 'ESM-native' }] }
      }
    })
    expect(result.isError).toBeFalsy()
    const text = (result.content[0] as { type: string; text: string }).text
    const parsed = JSON.parse(text) as Record<string, unknown>
    expect(parsed.success).toBe(true)
    await server.close()
  })

  it('codebase_read returns success', async () => {
    const { client, server } = await makeClient()
    const result = await client.callTool({ name: 'codebase_read', arguments: { section: 'all' } })
    expect(result.isError).toBeFalsy()
    await server.close()
  })

  it('rules_read returns success', async () => {
    const { client, server } = await makeClient()
    const result = await client.callTool({ name: 'rules_read', arguments: {} })
    expect(result.isError).toBeFalsy()
    await server.close()
  })

  it('context_list returns project list', async () => {
    const { client, server } = await makeClient()
    const result = await client.callTool({ name: 'context_list', arguments: {} })
    expect(result.isError).toBeFalsy()
    const text = (result.content[0] as { type: string; text: string }).text
    const parsed = JSON.parse(text) as Record<string, unknown>
    expect(parsed.success).toBe(true)
    expect((parsed.data as Record<string, unknown>).total).toBe(1)
    await server.close()
  })

  it('lists all 4 resources', async () => {
    const { client, server } = await makeClient()
    const { resources } = await client.listResources()
    const uris = resources.map(r => r.uri).sort()
    expect(uris).toEqual(['mexai://all', 'mexai://codebase', 'mexai://context', 'mexai://rules'])
    await server.close()
  })
})
