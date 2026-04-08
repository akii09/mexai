import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleCodebaseRead } from './codebase-read.js'

const { mockReadLayer, mockParseCodebase, mockResolveProject, MockStoreError } = vi.hoisted(() => {
  const MockStoreError = class extends Error {
    code: string
    constructor(code: string, msg: string) {
      super(msg)
      this.code = code
    }
  }
  return {
    mockReadLayer: vi.fn(),
    mockParseCodebase: vi.fn(),
    mockResolveProject: vi.fn(),
    MockStoreError,
  }
})

vi.mock('@mexai/core', () => ({
  readLayer: mockReadLayer,
  parseCodebase: mockParseCodebase,
  resolveProject: mockResolveProject,
  StoreError: MockStoreError,
}))

describe('handleCodebaseRead', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockResolveProject.mockReturnValue({ slug: 'p', name: 'P', path: '/p' })
  })

  it('returns raw content when section is all', () => {
    mockReadLayer.mockReturnValue('# Codebase\nraw content')
    const result = handleCodebaseRead({ section: 'all' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).content).toBe('# Codebase\nraw content')
    }
    expect(mockParseCodebase).not.toHaveBeenCalled()
  })

  it('returns specific section when requested', () => {
    mockReadLayer.mockReturnValue('raw')
    mockParseCodebase.mockReturnValue({
      structure: '## Structure\ntree',
      keyFiles: '',
      conventions: '',
      patterns: '',
      doNotTouch: '',
    })
    const result = handleCodebaseRead({ section: 'structure' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).content).toBe('## Structure\ntree')
    }
  })

  it('returns LAYER_NOT_INITIALIZED when codebase.md missing', () => {
    mockReadLayer.mockImplementation(() => {
      throw new MockStoreError('LAYER_NOT_INITIALIZED', 'Not initialized')
    })
    const result = handleCodebaseRead({})
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('LAYER_NOT_INITIALIZED')
  })

  it('defaults section to all when not specified', () => {
    mockReadLayer.mockReturnValue('raw')
    const result = handleCodebaseRead({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).section).toBe('all')
    }
  })
})
