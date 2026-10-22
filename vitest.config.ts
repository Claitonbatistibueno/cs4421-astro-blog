import { getViteConfig } from 'astro/config';
import { configDefaults } from 'vitest/config';

// getViteConfig loads the Astro Vite plugins, so tests can import and render
// .astro components (component tests in src/components/*.test.ts).
// cdk/ has its own test runner (Jest, `npm test` inside cdk/) and its own
// dependencies, and farm-app/ is the PHP system, so both are left out here.
export default getViteConfig({
  test: {
    exclude: [...configDefaults.exclude, 'cdk/**', 'farm-app/**'],
  },
});
