import { describe, it, expect } from 'vitest';

describe('date formatting', () => {
  it('formats a date like the blog does', () => {
    const date = new Date('2026-09-23T00:00:00Z');
    const formatted = date.toLocaleDateString('en-us', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    expect(formatted).toBe('Sep 23, 2026');
  });

  it('parses a date string into a valid Date', () => {
    const date = new Date('2026-09-23');
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(8); // meses começam em 0, então setembro = 8
  });
});