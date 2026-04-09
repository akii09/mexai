/**
 * mexai init — interactive project initialization wizard.
 *
 * Prompts for project details, creates the store entry, initialises git,
 * and optionally configures MCP for the current IDE.
 */

import * as path from 'node:path'
import * as os from 'node:os'
import inquirer from 'inquirer'
import ora from 'ora'
import chalk from 'chalk'
import {
  initProject,
  gitInit,
  gitCommit,
  projectStorePath,
  writeProjectLink,
  readProjectLink,
  listProjects,
  linkPath,
  slugify,
  scanCodebase,
  generateDraft,
  writeLayer,
} from '@mexai/core'
import { success, info, warn, blank, header } from '../utils/output.js'
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

    // Guard A: mexai.json already exists in this directory
    const existingLinkedSlug = readProjectLink(cwd)
    if (existingLinkedSlug !== undefined) {
      const allProjects = listProjects()
      const existingProject = allProjects.find((p) => p.slug === existingLinkedSlug)
      if (existingProject !== undefined) {
        blank()
        warn(`This directory is already linked to project "${existingProject.name}" (slug: ${existingProject.slug}).`)
        blank()
        info('What would you like to do?')
        const { action } = await inquirer.prompt<{ action: string }>([
          {
            type: 'list',
            name: 'action',
            message: 'Choose an option:',
            choices: [
              { name: `Use existing project "${existingProject.name}"  (recommended)`, value: 'use' },
              { name: 'Create a new project in this directory anyway', value: 'new' },
              { name: 'Cancel', value: 'cancel' },
            ],
          },
        ])
        if (action === 'cancel') {
          info('Cancelled.')
          return
        }
        if (action === 'use') {
          blank()
          success(`Using existing project "${existingProject.name}" (slug: ${existingProject.slug}).`)
          info(`Run  mexai status  to see current state, or  mexai diff  to review pending changes.`)
          return
        }
        // action === 'new' — fall through to create a new project
        blank()
      }
    }

    // Warn if running from the home directory — this is almost always a mistake.
    // The registered path is used to auto-detect the project in future commands.
    if (cwd === os.homedir() || cwd === path.dirname(os.homedir())) {
      blank()
      warn('You are initialising from your home directory.')
      warn('Run  mexai init  from inside your project directory instead.')
      warn(`  cd /path/to/your/project && mexai init`)
      blank()
      info('Continuing anyway — you can fix the path later with  mexai link <slug>.')
    }

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

    // Guard B: slug collision — same name already exists in registry
    const intendedSlug = slugify(answers.name.trim())
    const registryProjects = listProjects()
    const conflicting = registryProjects.find((p) => p.slug === intendedSlug)
    if (conflicting !== undefined) {
      blank()
      warn(`A project named "${conflicting.name}" (slug: ${conflicting.slug}) already exists in mexai.`)
      blank()
      info('What would you like to do?')
      const { collisionAction } = await inquirer.prompt<{ collisionAction: string }>([
        {
          type: 'list',
          name: 'collisionAction',
          message: 'Choose an option:',
          choices: [
            { name: `Link this directory to "${conflicting.name}"  (use the existing project)`, value: 'link' },
            { name: 'Create a new project with a different name', value: 'rename' },
            { name: 'Cancel', value: 'cancel' },
          ],
        },
      ])
      if (collisionAction === 'cancel') {
        info('Cancelled.')
        return
      }
      if (collisionAction === 'link') {
        linkPath(conflicting.slug, cwd)
        writeProjectLink(cwd, conflicting.slug)
        blank()
        success(`Linked this directory to "${conflicting.name}" (slug: ${conflicting.slug}).`)
        info(`Run  mexai status  to see current state.`)
        return
      }
      // collisionAction === 'rename' — ask for a different name and fall through
      const { newName } = await inquirer.prompt<{ newName: string }>([
        {
          type: 'input',
          name: 'newName',
          message: 'Enter a different project name:',
          validate: (v: string) => {
            if (v.trim().length === 0) return 'Name is required.'
            const s = slugify(v.trim())
            const exists = registryProjects.find((p) => p.slug === s)
            return exists !== undefined ? `"${exists.name}" already exists. Try a different name.` : true
          },
        },
      ])
      answers.name = newName.trim()
      blank()
    }

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

    // Write mexai.json to cwd so the project is auto-detected in future
    writeProjectLink(cwd, slug)

    // Initialise git in the store directory
    const storePath = projectStorePath(slug)
    await gitInit(storePath)
    await gitCommit(storePath, 'mexai: initial project setup')

    // Auto-scan the codebase to populate codebase.md
    spinner.text = 'Scanning codebase…'
    try {
      const scanResult = scanCodebase(cwd)
      const draft = generateDraft(scanResult)
      writeLayer(slug, 'codebase', draft)
      spinner.text = 'Committing initial scan…'
      await gitCommit(storePath, 'mexai: initial codebase scan')
    } catch {
      // Scan failed — not fatal, user can run mexai map manually
    }

    spinner.succeed('Project store initialised.')
    blank()

    success(`Project "${answers.name}" created with slug: ${slug}`)
    info(`Store: ~/.mexai/projects/${slug}/`)
    blank()
    info('mexai.json written to this directory for auto-detection.')
    blank()

    // Show the AI bootstrap prompt
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log(chalk.bold('  Bootstrap your AI context'))
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    blank()
    console.log('Paste this into your AI editor (Cursor, Claude Code, etc.):')
    blank()
    console.log(chalk.cyan('┌─────────────────────────────────────────────────────────┐'))
    console.log(chalk.cyan('│') + chalk.white.bold(` Mexai bootstrap for: ${answers.name.trim()}`).padEnd(58) + chalk.cyan('│'))
    console.log(chalk.cyan('│') + '                                                         ' + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim(' I just initialised a mexai context store for this      ') + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim(' project. Please:                                        ') + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim(' 1. Read the codebase carefully                          ') + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim(' 2. Use context_save to fill in:                         ') + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim('    - A detailed project identity paragraph               ') + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim('    - The current development state                      ') + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim('    - Key architectural decisions made so far            ') + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim(' 3. Use the codebase tools to document:                  ') + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim('    - Key files and their purposes                       ') + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim('    - Code conventions and patterns                      ') + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim('    - Files that must not be modified                    ') + chalk.cyan('│'))
    console.log(chalk.cyan('│') + '                                                         ' + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim(' Then run:  mexai diff   to review the changes           ') + chalk.cyan('│'))
    console.log(chalk.cyan('│') + chalk.dim('            mexai commit  to apply them                  ') + chalk.cyan('│'))
    console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'))
    blank()

    if (options.slug !== undefined) {
      // User passed --slug flag — already handled via initProject
    }
  } catch (err) {
    handleError(err)
  }
}
