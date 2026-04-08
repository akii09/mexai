/**
 * mexai CLI — entry point.
 * Phase 3 will wire all commands. This stub ensures the package builds.
 */

import { Command } from 'commander'

const program = new Command()

program
  .name('mexai')
  .description('Local-first AI context manager')
  .version('0.1.0')

program.parse(process.argv)
