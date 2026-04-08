import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],        // CLI is CJS only — Node.js binary
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  target: 'node20',
  banner: {
    js: '#!/usr/bin/env node',
  },
  noExternal: [],         // bundle nothing — keep deps external for smaller binary
})