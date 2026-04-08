import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // MCP integration tests spawn subprocesses — longer timeout
    testTimeout: 15000,
    passWithNoTests: true,
    isolate: true,
  },
})