/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [require.resolve('./index.cjs')],
  rules: {
    // Tests legitimately use non-null assertions for conciseness
    '@typescript-eslint/no-non-null-assertion': 'off',

    // Tests can log for debugging
    'no-console': 'off',

    // Floating promises are common in test setup (beforeEach etc.)
    '@typescript-eslint/no-floating-promises': 'warn',

    // Type assertions are common in test assertions
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',

    // require-await can conflict with vi.fn().mockResolvedValue patterns
    '@typescript-eslint/require-await': 'off',
  },
}
