import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleContextSave } from './context-save.js'

const {
  mockReadPendingDiff,
  mockWritePendingDiff,
  mockResolveProject,
  mockBuild,
  mockMerge,
  MockDiffEngine,
  MockStoreError,
} = vi.hoisted(() => {
  const MockStoreError = class extends Error {
    code: string
    constructor(code: string, msg: string) {
      super(msg)
      this.code = code
    }
  }
  const mockBuild = vi.fn()
  const mockMerge = vi.fn()
  const MockDiffEngine = vi.fn(() => ({ build: mockBuild, merge: mockMerge }))
  return {
    mockReadPendingDiff: vi.fn(),
    mockWritePendingDiff: vi.fn(),
    mockResolveProject: vi.fn(),
    mockBuild,
    mockMerge,
    MockDiffEngine,
    MockStoreError,
  }
})

vi.mock('@mexai/core', () => ({
  readPendingDiff: mockReadPendingDiff,
  writePendingDiff: mockWritePendingDiff,
  resolveProject: mockResolveProject,
  DiffEngine: MockDiffEngine,
  StoreError: MockStoreError,
}))

const fakeDiff = {
  projectSlug: 'p',
  sources: ['cursor'],
  commitMessage: 'test',
  changes: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  preview: {
    decisionsAdded: 1,
    threadsAdded: 0,
    threadsResolved: 0,
    currentStateChanged: false,
    summary: '1 decision',
  },
}

describe('handleContextSave', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockResolveProject.mockReturnValue({ slug: 'p', name: 'P', path: '/p' })
    // Restore DiffEngine implementation after reset clears it
    MockDiffEngine.mockImplementation(() => ({ build: mockBuild, merge: mockMerge }))
  })

  it('calls engine.build when no existing diff', () => {
    mockReadPendingDiff.mockReturnValue(undefined)
    mockBuild.mockReturnValue(fakeDiff)
    const result = handleContextSave({
      source: 'cursor',
      commitMessage: 'add decision',
      changes: { decisions: [{ title: 'T', rationale: 'R' }] },
    })
    expect(mockBuild).toHaveBeenCalledOnce()
    expect(mockMerge).not.toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(mockWritePendingDiff).toHaveBeenCalledWith('p', fakeDiff)
  })

  it('calls engine.merge when existing diff is present', () => {
    mockReadPendingDiff.mockReturnValue(fakeDiff)
    mockMerge.mockReturnValue(fakeDiff)
    handleContextSave({
      source: 'claude-code',
      commitMessage: 'add more',
      changes: { currentState: 'Working on Phase 4' },
    })
    expect(mockMerge).toHaveBeenCalledOnce()
    expect(mockBuild).not.toHaveBeenCalled()
  })

  it('returns error when project not found', () => {
    mockResolveProject.mockImplementation(() => {
      throw new MockStoreError('NO_ACTIVE_PROJECT', 'No active project')
    })
    const result = handleContextSave({
      source: 'cursor',
      commitMessage: 'test',
      changes: { currentState: 'x' },
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('NO_ACTIVE_PROJECT')
  })
})
