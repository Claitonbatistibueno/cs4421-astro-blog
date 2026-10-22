import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import FormattedDate from './FormattedDate.astro';
import ReportNav from './reports/ReportNav.astro';
import Stats from './reports/Stats.astro';

// Component tests: render the real .astro component to HTML and check the
// output, the same way the page would show it to a visitor.
let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('FormattedDate', () => {
  it('renders a <time> with the ISO date and the readable date', async () => {
    const html = await container.renderToString(FormattedDate, {
      props: { date: new Date('2026-09-23T00:00:00Z') },
    });

    expect(html).toContain('<time datetime="2026-09-23T00:00:00.000Z">');
    expect(html).toContain('Sep 23, 2026</time>');
  });
});

describe('Stats', () => {
  it('renders one card per item, with value and label', async () => {
    const html = await container.renderToString(Stats, {
      props: {
        items: [
          { value: '42', label: 'Active animals' },
          { value: '€ 3.20', label: 'Price per kg' },
        ],
      },
    });

    // Scoped styles add a data-astro-cid-* attribute to each tag,
    // so the checks match the tag name and the text, not the full tag.
    expect(html.match(/class="stat"/g)).toHaveLength(2);
    expect(html).toMatch(/<strong[^>]*>42<\/strong>/);
    expect(html).toMatch(/<span[^>]*>Active animals<\/span>/);
    expect(html).toMatch(/<strong[^>]*>€ 3\.20<\/strong>/);
  });

  it('renders no cards when there is no data', async () => {
    const html = await container.renderToString(Stats, { props: { items: [] } });

    expect(html).not.toContain('class="stat"');
  });
});

describe('ReportNav', () => {
  it('marks only the tab of the current page as active', async () => {
    const html = await container.renderToString(ReportNav, {
      request: new Request('https://example.com/reports/weight/'),
    });

    const active = html.match(/<a[^>]*class="[^"]*\bactive\b[^"]*"[^>]*>[^<]*<\/a>/g) ?? [];
    expect(active).toHaveLength(1);
    expect(active[0]).toContain('href="/reports/weight"');
    expect(active[0]).toContain('>Weight<');
  });

  it('links to the dashboard and all five reports', async () => {
    const html = await container.renderToString(ReportNav, {
      request: new Request('https://example.com/dashboard'),
    });

    for (const href of [
      '/dashboard',
      '/reports/animals',
      '/reports/weight',
      '/reports/feeding',
      '/reports/health',
      '/reports/financial',
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
  });
});
