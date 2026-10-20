import type { APIRoute } from 'astro';

// GET /api/health — the health check used by the ALB / ECS service (Week 5 lab, ADR-001).
// ROLLBACK DRILL 2: intentionally broken — always answers HTTP 500 so the ALB health
// check fails, the 5xx alarm fires and ECS must roll back to the previous image.
export const GET: APIRoute = () =>
  Response.json(
    {
      status: 'error',
      reason: 'Rollback Drill 2: intentional failure',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    { status: 500 },
  );
