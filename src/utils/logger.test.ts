import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLog, logRequest } from './logger';
import { validateFeedback } from './feedback';

afterEach(() => vi.restoreAllMocks());

describe('structured logger', () => {
  it('writes valid JSON with the expected keys', () => {
    const out = vi.spyOn(console, 'log').mockImplementation(() => {});
    logRequest({ route: '/api/health', method: 'GET', statusCode: 200, latencyMs: 3 });
    const line = JSON.parse(out.mock.calls[0][0] as string);
    expect(line).toMatchObject({ level: 'INFO', route: '/api/health', method: 'GET', statusCode: 200, latencyMs: 3 });
    expect(typeof line.timestamp).toBe('string');
  });

  it('sends 5xx responses to stderr as ERROR', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    logRequest({ route: '/x', method: 'GET', statusCode: 503, latencyMs: 1 });
    expect(JSON.parse(err.mock.calls[0][0] as string).level).toBe('ERROR');
  });

  it('buildLog keeps extra fields', () => {
    expect(JSON.parse(buildLog('WARN', { event: 'test' }))).toMatchObject({ level: 'WARN', event: 'test' });
  });
});

describe('validateFeedback', () => {
  it('accepts a valid message and defaults the name', () => {
    expect(validateFeedback({ message: 'Great tool' })).toEqual({
      ok: true,
      value: { name: 'anonymous', message: 'Great tool' },
    });
  });

  it('rejects missing or short messages', () => {
    expect(validateFeedback({}).ok).toBe(false);
    expect(validateFeedback({ message: 'hi' }).ok).toBe(false);
    expect(validateFeedback(null).ok).toBe(false);
  });
});
