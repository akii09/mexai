import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scan, generateDraft } from './codebase-scanner.js'
import { parseCodebase } from '../formats/codebase-format.js'

// ---------------------------------------------------------------------------
// Tmp filesystem helpers
// ---------------------------------------------------------------------------

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mexai-scanner-test-'))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

function writeJson(filePath: string, data: unknown): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function touch(filePath: string, content = ''): void {
  const dir = join(filePath, '..')
  mkdirSync(dir, { recursive: true })
  writeFileSync(filePath, content, 'utf8')
}

// ---------------------------------------------------------------------------
// Framework detection
// ---------------------------------------------------------------------------

describe('scan — framework detection', () => {
  it('detects Next.js project from dependencies', () => {
    writeJson(join(tmpDir, 'package.json'), {
      name: 'my-app',
      dependencies: { next: '^14.0.0', react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    })

    const result = scan(tmpDir)
    expect(result.frameworks).toContain('Next.js')
  })

  it('detects Next.js from next.config.js', () => {
    writeJson(join(tmpDir, 'package.json'), {
      name: 'my-app',
      dependencies: { react: '^18.0.0' },
    })
    touch(join(tmpDir, 'next.config.js'), 'module.exports = {}')

    const result = scan(tmpDir)
    expect(result.frameworks).toContain('Next.js')
  })

  it('detects Vite + React project', () => {
    writeJson(join(tmpDir, 'package.json'), {
      name: 'vite-app',
      dependencies: { react: '^18.0.0' },
      devDependencies: { vite: '^5.0.0', typescript: '^5.0.0' },
    })

    const result = scan(tmpDir)
    expect(result.frameworks).toContain('Vite')
    expect(result.frameworks).toContain('React')
  })

  it('detects Express project', () => {
    writeJson(join(tmpDir, 'package.json'), {
      name: 'api-server',
      dependencies: { express: '^4.18.0' },
    })

    const result = scan(tmpDir)
    expect(result.frameworks).toContain('Express')
  })

  it('detects plain Node.js project (no framework)', () => {
    writeJson(join(tmpDir, 'package.json'), {
      name: 'plain-node',
      dependencies: {},
      devDependencies: { typescript: '^5.0.0' },
    })

    const result = scan(tmpDir)
    expect(result.frameworks).toHaveLength(0)
    expect(result.hasTypeScript).toBe(true)
  })

  it('handles missing package.json gracefully', () => {
    const result = scan(tmpDir)
    expect(result.frameworks).toHaveLength(0)
    expect(result.packageJson).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Test framework detection
// ---------------------------------------------------------------------------

describe('scan — test framework detection', () => {
  it('detects Vitest', () => {
    writeJson(join(tmpDir, 'package.json'), {
      devDependencies: { vitest: '^1.0.0' },
    })
    expect(scan(tmpDir).testFrameworks).toContain('Vitest')
  })

  it('detects Jest', () => {
    writeJson(join(tmpDir, 'package.json'), {
      devDependencies: { jest: '^29.0.0' },
    })
    expect(scan(tmpDir).testFrameworks).toContain('Jest')
  })
})

// ---------------------------------------------------------------------------
// Styling detection
// ---------------------------------------------------------------------------

describe('scan — styling detection', () => {
  it('detects Tailwind CSS from devDependencies', () => {
    writeJson(join(tmpDir, 'package.json'), {
      devDependencies: { tailwindcss: '^3.0.0' },
    })
    expect(scan(tmpDir).styling).toContain('Tailwind CSS')
  })

  it('detects styled-components from dependencies', () => {
    writeJson(join(tmpDir, 'package.json'), {
      dependencies: { 'styled-components': '^6.0.0' },
    })
    expect(scan(tmpDir).styling).toContain('styled-components')
  })
})

// ---------------------------------------------------------------------------
// TypeScript detection
// ---------------------------------------------------------------------------

describe('scan — TypeScript detection', () => {
  it('detects TypeScript from devDependencies', () => {
    writeJson(join(tmpDir, 'package.json'), {
      devDependencies: { typescript: '^5.0.0' },
    })
    expect(scan(tmpDir).hasTypeScript).toBe(true)
  })

  it('detects strict mode from tsconfig', () => {
    writeJson(join(tmpDir, 'tsconfig.json'), {
      compilerOptions: { strict: true, target: 'ES2022' },
    })
    expect(scan(tmpDir).strictMode).toBe(true)
  })

  it('returns strictMode false when not enabled', () => {
    writeJson(join(tmpDir, 'tsconfig.json'), {
      compilerOptions: { target: 'ES2022' },
    })
    expect(scan(tmpDir).strictMode).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Directory tree
// ---------------------------------------------------------------------------

describe('scan — directory tree', () => {
  it('excludes node_modules from the tree', () => {
    mkdirSync(join(tmpDir, 'node_modules', 'some-pkg'), { recursive: true })
    mkdirSync(join(tmpDir, 'src'))
    touch(join(tmpDir, 'src', 'index.ts'))

    const result = scan(tmpDir)
    const treeStr = JSON.stringify(result.tree)
    expect(treeStr).not.toContain('node_modules')
    expect(treeStr).toContain('src')
  })

  it('excludes .git from the tree', () => {
    mkdirSync(join(tmpDir, '.git', 'refs'), { recursive: true })
    const result = scan(tmpDir)
    const treeStr = JSON.stringify(result.tree)
    expect(treeStr).not.toContain('.git')
  })
})

// ---------------------------------------------------------------------------
// generateDraft
// ---------------------------------------------------------------------------

describe('generateDraft', () => {
  it('marks output as DRAFT', () => {
    const result = scan(tmpDir)
    const draft = generateDraft(result)
    expect(draft).toContain('DRAFT')
  })

  it('output is parseable by parseCodebase', () => {
    writeJson(join(tmpDir, 'package.json'), {
      devDependencies: { typescript: '^5.0.0', vitest: '^1.0.0' },
    })
    const result = scan(tmpDir)
    const draft = generateDraft(result)
    expect(() => parseCodebase(draft)).not.toThrow()
  })

  it('includes convention stubs based on detected TypeScript', () => {
    writeJson(join(tmpDir, 'package.json'), {
      devDependencies: { typescript: '^5.0.0' },
    })
    writeJson(join(tmpDir, 'tsconfig.json'), {
      compilerOptions: { strict: true },
    })
    const result = scan(tmpDir)
    const draft = generateDraft(result)
    expect(draft).toContain('strict mode')
  })

  it('handles empty project gracefully', () => {
    const result = scan(tmpDir)
    const draft = generateDraft(result)
    expect(draft.length).toBeGreaterThan(0)
    expect(draft).toContain('Codebase Map')
  })
})
