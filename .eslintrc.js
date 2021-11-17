module.exports = {
  extends: [
    'react-app',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended'
  ],
  rules: {
    'prettier/prettier': 'error',
    curly: 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    'no-console': ['error', { allow: ['debug', 'warn', 'error'] }],
    'no-debugger': 'error',
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
  },
  settings: {
    react: {
      version: '999.999.999',
    },
  },
};
