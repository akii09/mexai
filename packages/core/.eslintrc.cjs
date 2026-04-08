/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@mexai/eslint-config/node'],
  parserOptions: {
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
}
