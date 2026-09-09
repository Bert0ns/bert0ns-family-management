// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      '.expo/**',
      'web-build/**',
      'coverage/**',
      '.agents/**',
      'docs/**',
      '*.config.js',
    ],
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['__tests__/**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
]);
