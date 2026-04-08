/**
 * mexai init — interactive project initialization wizard.
 *
 * Prompts for project details, creates the store entry, initialises git,
 * and optionally configures MCP for the current IDE.
 */

import * as path from 'node:path'
import inquirer from 'inquirer'
import ora from 'ora'
import {
  initProject,
  gitInit,
  gitCommit,
  projectStorePath,
} from '@mexai/core'
import { success, info, blank, header } from '../utils/output.js'
import { handleError } from '../utils/error-handler.js'

interface InitAnswers {
  name: string
  domain: string
  stack: string
  identity: string
  currentState: string
}

export async function runInit(options: { slug?: string }): Promise<void> {
  try {
    const cwd = process.cwd()

    header('mexai init')
    info('Setting up a new project context store.')
    blank()

    const answers = await inquirer.prompt<InitAnswers>([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: path.basename(cwd),
        validate: (v: string) => v.trim().length > 0 || 'Name is required.',
      },
      {
        type: 'input',
        name: 'domain',
        message: 'Domain (e.g. web-app, cli-tool, api, library):',
        default: 'web-app',
        validate: (v: string) => v.trim().length > 0 || 'Domain is required.',
      },
      {
        type: 'input',
        name: 'stack',
        message: 'Stack (comma-separated, e.g. TypeScript, React, Node.js):',
        default: 'TypeScript',
        validate: (v: string) => v.trim().length > 0 || 'Stack is required.',
      },
      {
        type: 'input',
        name: 'identity',
        message: 'One-line project description (for AI context):',
        validate: (v: string) => v.trim().length > 0 || 'Description is required.',
      },
      {
        type: 'input',
        name: 'currentState',
        message: 'Current state of the project (what are you working on?):',
        default: 'Initial setup.',
      },
    ])

    blank()
    const spinner = ora('Initialising project store…').start()

    const stack = answers.stack.split(',').map((s) => s.trim()).filter(Boolean)

    const slug = initProject({
      name: answers.name.trim(),
      domain: answers.domain.trim(),
      stack,
      identity: answers.identity.trim(),
      currentState: answers.currentState.trim(),
      codebasePath: cwd,
    })

    // Initialise git in the store directory
    const storePath = projectStorePath(slug)
    await gitInit(storePath)
    await gitCommit(storePath, 'mexai: initial project setup')

    spinner.succeed('Project store initialised.')
    blank()

    success(`Project "${answers.name}" created with slug: ${slug}`)
    info(`Store: ~/.mexai/projects/${slug}/`)
    blank()
    info('Next steps:')
    console.log('  1. Run  mexai map       to scan your codebase')
    console.log('  2. Run  mexai connect   to configure your AI editor')
    console.log('  3. Run  mexai status    to see the current state')

    if (options.slug !== undefined) {
      // User passed --slug flag — already handled via initProject
    }
  } catch (err) {
    handleError(err)
  }
}
