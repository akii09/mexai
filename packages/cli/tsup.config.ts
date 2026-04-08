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
  // chalk v5, ora v8, inquirer v9 are ESM-only.
  // Bundle them so the CJS output works without dynamic import().
  noExternal: ['chalk', 'ora', 'inquirer'],
})
