import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleRulesRead } from './rules-read.js'

const { mockReadLayer, mockParseRules, mockResolveProject, MockStoreError } = vi.hoisted(() => {
  const MockStoreError = class extends Error {
    code: string
    constructor(code: string, msg: string) {
      super(msg)
      this.code = code
    }
  }
  return {
    mockReadLayer: vi.fn(),
    mockParseRules: vi.fn(),
    mockResolveProject: vi.fn(),
    MockStoreError,
  }
})

vi.mock('@mexai/core', () => ({
  readLayer: mockReadLayer,
  parseRules: mockParseRules,
  resolveProject: mockResolveProject,
  StoreError: MockStoreError,
}))

describe('handleRulesRead', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockResolveProject.mockReturnValue({ slug: 'p', name: 'P', path: '/p' })
  })

  it('returns parsed rules content for active project', () => {
    mockReadLayer.mockReturnValue('# Agent Rules\n## Code Quality\n- TypeScript strict')
    mockParseRules.mockReturnValue({
      raw: '# Agent Rules\n## Code Quality\n- TypeScript strict',
      codeQuality: '- TypeScript strict',
      security: '',
      consistency: '',
      reviewGates: '',
    })
    const result = handleRulesRead({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).content).toBe(
        '# Agent Rules\n## Code Quality\n- TypeScript strict'
      )
      expect((result.data as Record<string, unknown>).projectSlug).toBe('p')
    }
  })

  it('resolves project by workspacePath when slug not provided', () => {
    mockReadLayer.mockReturnValue('rules content')
    mockParseRules.mockReturnValue({ raw: 'rules content', codeQuality: '', security: '', consistency: '', reviewGates: '' })
    handleRulesRead({ workspacePath: '/my/project' })
    expect(mockResolveProject).toHaveBeenCalledWith({ workspacePath: '/my/project' })
  })

  it('returns LAYER_NOT_INITIALIZED when rules.md missing', () => {
    mockReadLayer.mockImplementation(() => {
      throw new MockStoreError('LAYER_NOT_INITIALIZED', 'Layer not initialized')
    })
    const result = handleRulesRead({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('LAYER_NOT_INITIALIZED')
      expect(result.message).toBe('Layer not initialized')
    }
  })

  it('returns NO_ACTIVE_PROJECT when no project resolved', () => {
    mockResolveProject.mockImplementation(() => {
      throw new MockStoreError('NO_ACTIVE_PROJECT', 'No active project set')
    })
    const result = handleRulesRead({})
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('NO_ACTIVE_PROJECT')
  })

  it('resolves project by explicit slug', () => {
    mockReadLayer.mockReturnValue('rules')
    mockParseRules.mockReturnValue({ raw: 'rules', codeQuality: '', security: '', consistency: '', reviewGates: '' })
    handleRulesRead({ slug: 'my-slug' })
    expect(mockResolveProject).toHaveBeenCalledWith({ slug: 'my-slug' })
  })
})
