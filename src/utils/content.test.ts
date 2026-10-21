// Guards for the blog content (FARM-16 and the date bug found in the audit).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(process.cwd(), 'src', 'content', 'blog');
const posts = readdirSync(dir)
  .filter((f) => /\.mdx?$/.test(f))
  .map((f) => ({ file: f, text: readFileSync(join(dir, f), 'utf-8') }));

const frontmatter = (text: string, key: string) =>
  text.match(new RegExp(`^${key}:\\s*['"]?([^'"\\n]+)['"]?`, 'm'))?.[1];

describe('blog content', () => {
  it('has at least one post', () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it.each(posts)('$file uses an ISO date (YYYY-MM-DD)', ({ text }) => {
    // "Sep 16 2026" is parsed in the build machine's time zone, so the same
    // post showed Sep 15 when built in Dublin and Sep 16 in CI (UTC).
    // ISO dates are always parsed as UTC, which keeps the build reproducible.
    expect(frontmatter(text, 'pubDate')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each(posts)('$file has no template placeholder text', ({ text }) => {
    expect(text).not.toMatch(/lorem ipsum/i);
  });
});
