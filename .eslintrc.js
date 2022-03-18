module.exports = {
  root: true,
  extends: ['@react-native-community', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'prettier/prettier': 'warn',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],
  },
};
