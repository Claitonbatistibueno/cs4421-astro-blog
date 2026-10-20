import { defineMiddleware } from 'astro:middleware';
import { logRequest } from './utils/logger';

// Runs around every server-rendered request and writes one JSON log line.
export const onRequest = defineMiddleware(async (context, next) => {
  // Pre-rendered pages pass through here at build time; only log real requests.
  if (context.isPrerendered) return next();

  const start = performance.now();
  let statusCode = 500;
  try {
    const response = await next();
    statusCode = response.status;
    return response;
  } finally {
    logRequest({
      route: context.url.pathname,
      method: context.request.method,
      statusCode,
      latencyMs: Math.round(performance.now() - start),
    });
  }
});
