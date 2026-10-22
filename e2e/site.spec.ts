import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The pages a visitor can reach from the main navigation.
const pages = [
  '/',
  '/dashboard',
  '/reports',
  '/reports/animals',
  '/reports/weight',
  '/reports/feeding',
  '/reports/health',
  '/reports/financial',
  '/blog',
  '/about',
  '/coming-soon',
];

for (const path of pages) {
  test(`${path} loads, is accessible and fits the screen`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Farm Project/);
    await expect(page.locator('h1')).toHaveCount(1);

    // No sideways scrolling, on desktop or on the phone-sized project.
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits).toBe(true);

    // Every image on the page actually loaded.
    for (const image of await page.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      const loaded = await image.evaluate(
        (img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0,
      );
      expect(loaded).toBe(true);
    }

    // Automated WCAG 2.1 A/AA scan.
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    expect(errors).toEqual([]);
  });
}

test('main navigation reaches every section', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });

  for (const [label, heading] of [
    ['Dashboard', /dashboard/i],
    ['Reports', /report/i],
    ['Updates', /update/i],
    ['About', /about/i],
  ] as const) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(page.locator('h1')).toHaveText(heading);
  }
});

test('a farm update opens from the updates list', async ({ page }) => {
  await page.goto('/blog');
  const first = page.locator('main a[href^="/blog/"]').first();
  const title = (await first.innerText()).trim();
  await first.click();
  await expect(page.locator('h1')).toBeVisible();
  expect((await page.locator('h1').innerText()).length).toBeGreaterThan(0);
  expect(title.length).toBeGreaterThan(0);
});

test('an unknown page returns 404', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
});

test('feed and sitemap are published', async ({ request }) => {
  const feed = await request.get('/rss.xml');
  expect(feed.ok()).toBe(true);
  expect(await feed.text()).toContain('<rss');

  const sitemap = await request.get('/sitemap-index.xml');
  expect(sitemap.ok()).toBe(true);
});
