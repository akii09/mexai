import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleContextList } from './context-list.js'

const { mockListProjects, mockGetActive, MockStoreError } = vi.hoisted(() => {
  const MockStoreError = class extends Error {
    code: string
    constructor(code: string, msg: string) {
      super(msg)
      this.code = code
    }
  }
  return {
    mockListProjects: vi.fn(),
    mockGetActive: vi.fn(),
    MockStoreError,
  }
})

vi.mock('@mexai/core', () => ({
  listProjects: mockListProjects,
  getActive: mockGetActive,
  StoreError: MockStoreError,
}))

const makeProject = (slug: string, name: string) => ({
  slug,
  name,
  path: `/${slug}`,
  status: 'active' as const,
  updatedAt: new Date().toISOString(),
  hasPendingDiff: false,
})

describe('handleContextList', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns all projects with isActive flag', () => {
    mockListProjects.mockReturnValue([makeProject('alpha', 'Alpha'), makeProject('beta', 'Beta')])
    mockGetActive.mockReturnValue('alpha')
    const result = handleContextList()
    expect(result.success).toBe(true)
    if (result.success) {
      const data = result.data as Record<string, unknown>
      const projects = data.projects as Record<string, unknown>[]
      expect(projects).toHaveLength(2)
      expect(projects[0].isActive).toBe(true)
      expect(projects[1].isActive).toBe(false)
      expect(data.total).toBe(2)
      expect(data.active).toBe('alpha')
    }
  })

  it('returns empty list when no projects registered', () => {
    mockListProjects.mockReturnValue([])
    mockGetActive.mockReturnValue(undefined)
    const result = handleContextList()
    expect(result.success).toBe(true)
    if (result.success) {
      const data = result.data as Record<string, unknown>
      expect(data.total).toBe(0)
      expect(data.active).toBeNull()
      expect(data.projects).toEqual([])
    }
  })

  it('marks correct project as active', () => {
    mockListProjects.mockReturnValue([
      makeProject('x', 'X'),
      makeProject('y', 'Y'),
      makeProject('z', 'Z'),
    ])
    mockGetActive.mockReturnValue('z')
    const result = handleContextList()
    expect(result.success).toBe(true)
    if (result.success) {
      const data = result.data as Record<string, unknown>
      const projects = data.projects as Record<string, unknown>[]
      expect(projects[0].isActive).toBe(false)
      expect(projects[1].isActive).toBe(false)
      expect(projects[2].isActive).toBe(true)
      expect(data.active).toBe('z')
    }
  })

  it('returns null for active when no active project set', () => {
    mockListProjects.mockReturnValue([makeProject('solo', 'Solo')])
    mockGetActive.mockReturnValue(undefined)
    const result = handleContextList()
    expect(result.success).toBe(true)
    if (result.success) {
      const data = result.data as Record<string, unknown>
      expect(data.active).toBeNull()
      const projects = data.projects as Record<string, unknown>[]
      expect(projects[0].isActive).toBe(false)
    }
  })

  it('returns STORE_ERROR when listProjects throws', () => {
    mockListProjects.mockImplementation(() => {
      throw new MockStoreError('STORE_ERROR', 'Registry corrupted')
    })
    const result = handleContextList()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('STORE_ERROR')
  })
})
