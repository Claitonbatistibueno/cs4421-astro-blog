import { describe, it, expect } from 'vitest';
import { formatDate } from './date';

describe('formatDate', () => {
  it('formats a date like the blog does', () => {
    expect(formatDate(new Date('2026-09-23T00:00:00Z'))).toBe('Sep 24, 2026');
  });

  it('formats single-digit days without padding', () => {
    expect(formatDate(new Date('2026-01-05T00:00:00Z'))).toBe('Jan 5, 2026');
  });

  it('does not shift the day because of time zones', () => {
    expect(formatDate(new Date('2026-12-31T23:30:00Z'))).toBe('Dec 31, 2026');
  });
});