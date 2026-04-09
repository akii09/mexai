import { defineConfig } from 'tsup'

export default defineConfig([
  // Public library — consumed by CLI and other packages
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    target: 'node20',
  },
  // Standalone binary — spawned by `mexai serve`
  // Produces dist/server.cjs (the path serve.ts looks up)
  {
    entry: { server: 'src/bin.ts' },
    format: ['cjs'],
    dts: false,
    clean: false,
    sourcemap: false,
    splitting: false,
    treeshake: true,
    target: 'node20',
    banner: { js: '#!/usr/bin/env node' },
    outExtension: () => ({ js: '.cjs' }),
  },
])