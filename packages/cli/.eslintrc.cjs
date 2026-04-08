/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@mexai/eslint-config/node'],
  parserOptions: {
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    // CLI is a console application — console output is intentional
    'no-console': 'off',
    // inquirer v9 ships with incomplete TypeScript types — all its return
    // values propagate as `any`. Disabling the unsafe-* rules here is
    // intentional and scoped only to this CLI package.
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
  },
}
