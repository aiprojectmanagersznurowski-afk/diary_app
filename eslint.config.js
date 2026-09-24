// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'design_exports/**',
      '.expo/*',
      'ios/*',
      'android/*',
      // Infrastruktura Agent OS: poza zakresem tego zadania (docs/06-zasady-pracy.md).
      '.agent-os/**',
      '.agents/**',
      '.claude/**',
      '.gemini/**',
      '.husky/**',
      // Stary, nieużywany skrypt debugowy (poza scope.write F1-08).
      'test-metering.js',
    ],
  },
]);
