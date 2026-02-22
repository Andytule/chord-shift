module.exports = {
  root: true,
  env: { node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier', 'simple-import-sort', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    'prettier/prettier': 'error',

    'import/no-duplicates': ['error', { 'prefer-inline': true }],

    'simple-import-sort/imports': [
      'error',
      {
        groups: [['^node:'], [], ['^@?\\w'], ['^\\.'], []],
      },
    ],
    'simple-import-sort/exports': 'error',

    'import/first': 'error',
    'import/newline-after-import': 'error',

    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
