module.exports = {
  root: true,
  extends: [
    '@react-native-community',
    'prettier',
    './node_modules/@standardnotes/config/src/.eslintrc',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['.eslintrc.js'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-shadow': ['error'],
        'no-shadow': 'off',
        'no-undef': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-invalid-this': 'warn',
        'no-console': 'warn',
      },
    },
  ],
  rules: {
    'prettier/prettier': 'warn',
  },
}
