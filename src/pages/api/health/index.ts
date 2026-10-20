import type { APIRoute } from 'astro';

// GET /api/health — the health check used by the ALB / ECS service (Week 5 lab, ADR-001).
export const GET: APIRoute = () =>
  Response.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
