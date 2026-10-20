import type { APIRoute } from 'astro';

// Liveness: "is the process alive?" A failure means: restart the container.
export const GET: APIRoute = () =>
  Response.json({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
