// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // Guardrail: the Nimble API key lives on the server only. Screens, hooks and components
    // must go through `src/app/api/*` instead of importing server code or the SDK directly.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/app/api/**', 'src/features/*/server/**', '**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/server', '**/server/*', '@nimble-way/*'],
              message: 'Server-only code. Call the matching API route from the client instead.',
            },
          ],
        },
      ],
    },
  },
]);
