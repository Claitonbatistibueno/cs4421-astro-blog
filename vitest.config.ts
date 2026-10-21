import { configDefaults, defineConfig } from 'vitest/config';

// The site tests run with Vitest from the repository root.
// cdk/ has its own test runner (Jest, `npm test` inside cdk/) and its own
// dependencies, and farm-app/ is the PHP system, so both are left out here.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'cdk/**', 'farm-app/**'],
  },
});
