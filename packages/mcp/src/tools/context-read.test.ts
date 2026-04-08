import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleContextRead } from './context-read.js'

const { mockCompose, mockResolveProject, MockStoreError } = vi.hoisted(() => {
  const MockStoreError = class extends Error {
    code: string
    constructor(code: string, msg: string) {
      super(msg)
      this.code = code
    }
  }
  return {
    mockCompose: vi.fn(),
    mockResolveProject: vi.fn(),
    MockStoreError,
  }
})

vi.mock('@mexai/core', () => ({
  compose: mockCompose,
  resolveProject: mockResolveProject,
  StoreError: MockStoreError,
}))

describe('handleContextRead', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns success with injection payload for resolved project', () => {
    mockResolveProject.mockReturnValue({ slug: 'my-project', name: 'My Project', path: '/path' })
    mockCompose.mockReturnValue({
      text: '# Context',
      tokensUsed: 42,
      layerBreakdown: { context: 20, codebase: 12, rules: 10 },
    })
    const result = handleContextRead({ workspacePath: '/path' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).projectSlug).toBe('my-project')
      expect((result.data as Record<string, unknown>).tokensUsed).toBe(42)
    }
  })

  it('uses explicit slug over workspacePath', () => {
    mockResolveProject.mockReturnValue({ slug: 'explicit', name: 'Explicit', path: '/x' })
    mockCompose.mockReturnValue({ text: '', tokensUsed: 0, layerBreakdown: { context: 0, codebase: 0, rules: 0 } })
    handleContextRead({ workspacePath: '/other', slug: 'explicit' })
    expect(mockResolveProject).toHaveBeenCalledWith({ slug: 'explicit' })
  })

  it('returns error when project not found', () => {
    mockResolveProject.mockImplementation(() => {
      throw new MockStoreError('NO_ACTIVE_PROJECT', 'No active project')
    })
    const result = handleContextRead({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NO_ACTIVE_PROJECT')
    }
  })

  it('passes layers and maxTokens to compose', () => {
    mockResolveProject.mockReturnValue({ slug: 'p', name: 'P', path: '/p' })
    mockCompose.mockReturnValue({ text: '', tokensUsed: 0, layerBreakdown: { context: 0, codebase: 0, rules: 0 } })
    handleContextRead({ layers: ['context'], maxTokens: 200 })
    expect(mockCompose).toHaveBeenCalledWith('p', { layers: ['context'], maxTokens: 200 })
  })
})
