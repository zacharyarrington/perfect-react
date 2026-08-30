import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: [
      'src/**/*.test.{js,jsx}',
      'tests/e2e/**/*.{js,jsx}',
      'playwright.config.js',
      'vitest.config.js',
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
  },
  {
    // Playwright fixtures (tests/e2e/fixtures.js) accept a `use` callback
    // parameter per Playwright's own API — react-hooks otherwise flags it
    // as a misnamed Hook call since it starts with "use". This is plain
    // Node/Playwright code, not React, so the React-specific rules don't apply.
    files: ['tests/e2e/**/*.{js,jsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
