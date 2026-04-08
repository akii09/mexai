/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  // Root config intentionally minimal — each package has its own .eslintrc.cjs
  // This file exists only to prevent ESLint from walking above the monorepo root
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '.turbo/',
    'coverage/',
    '*.cjs',
    '*.mjs',
  ],
}
