import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: 'https://mexai.dev',
  integrations: [
    starlight({
      title: 'mexai',
      description: 'Local-first AI context manager. Keep every AI agent perfectly in sync with your project.',
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
      },
      social: {
        github: 'https://github.com/mexai/mexai',
      },
      editLink: {
        baseUrl: 'https://github.com/mexai/mexai/edit/main/docs/',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'introduction' },
            { label: 'Quick Start', slug: 'quick-start' },
            { label: 'How It Works', slug: 'how-it-works' },
          ],
        },
        {
          label: 'CLI Reference',
          items: [
            { label: 'Overview', slug: 'cli/overview' },
            { label: 'init', slug: 'cli/init' },
            { label: 'map', slug: 'cli/map' },
            { label: 'connect', slug: 'cli/connect' },
            { label: 'status', slug: 'cli/status' },
            { label: 'diff & commit', slug: 'cli/diff-commit' },
            { label: 'context-save', slug: 'cli/context-save' },
            { label: 'apply', slug: 'cli/apply' },
            { label: 'validate & doctor', slug: 'cli/validate-doctor' },
            { label: 'export', slug: 'cli/export' },
            { label: 'edit', slug: 'cli/edit' },
            { label: 'log & restore', slug: 'cli/log-restore' },
            { label: 'sync', slug: 'cli/sync' },
          ],
        },
        {
          label: 'MCP Integration',
          items: [
            { label: 'Overview', slug: 'mcp/overview' },
            { label: 'context_read', slug: 'mcp/context-read' },
            { label: 'context_save', slug: 'mcp/context-save' },
            { label: 'codebase_read', slug: 'mcp/codebase-read' },
            { label: 'rules_read', slug: 'mcp/rules-read' },
            { label: 'context_list', slug: 'mcp/context-list' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Solo Developer Workflow', slug: 'guides/solo-workflow' },
            { label: 'CI / Non-Interactive Mode', slug: 'guides/ci-mode' },
            { label: 'GitHub Sync', slug: 'guides/github-sync' },
            { label: 'Editor Setup', slug: 'guides/editor-setup' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Context Layers', slug: 'reference/context-layers' },
            { label: 'State Model', slug: 'reference/state-model' },
            { label: 'Token Budget', slug: 'reference/token-budget' },
          ],
        },
      ],
      head: [
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: 'https://mexai.dev/og.png',
          },
        },
      ],
    }),
  ],
})
