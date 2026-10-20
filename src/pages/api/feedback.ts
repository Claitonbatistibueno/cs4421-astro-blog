import type { APIRoute } from 'astro';
import { validateFeedback } from '../../utils/feedback';
import { buildLog } from '../../utils/logger';

// POST /api/feedback — accepts a feedback message (ADR-001).
// The message is validated and written to the structured log (CloudWatch);
// nothing is stored yet, so the endpoint stays stateless (12-Factor).
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body must be JSON' }, { status: 400 });
  }
  const result = validateFeedback(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 422 });

  console.log(buildLog('INFO', { event: 'feedback', ...result.value }));
  return Response.json({ status: 'received' }, { status: 201 });
};
