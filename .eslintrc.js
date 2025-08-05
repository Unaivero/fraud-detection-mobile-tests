module.exports = {
  env: {
    node: true,
    mocha: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:import/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'off', // Allow console for logging in tests
    'import/extensions': 'off',
    'import/no-unresolved': 'error',
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    'semi': ['error', 'always']
  }
};
