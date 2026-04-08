/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [require.resolve('./index.cjs')],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
}
