// Post-mortem action from Rollback Drill 2 (PR #52): the health route returned 500 and
// CI did not notice, because no test called it. These tests call the real route
// handlers, so a broken probe now fails in CI (shift left) instead of in production.
// (Kept outside src/pages: every .ts file there would become an HTTP route.)
import { describe, expect, it } from 'vitest';
import { GET as health } from '../pages/api/health/index';
import { GET as live } from '../pages/api/health/live';
import { GET as ready } from '../pages/api/health/ready';

type Ctx = Parameters<typeof health>[0];
const ctx = {} as Ctx;

describe('health probes', () => {
  it('GET /api/health returns 200 with status ok (ALB health check)', async () => {
    const res = await health(ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it('GET /api/health/live returns 200', async () => {
    const res = await live(ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('alive');
  });

  it('GET /api/health/ready returns 200 when the farm data loads', async () => {
    const res = await ready(ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ready');
    expect(body.checks.animals).toBeGreaterThan(0);
  });
});
