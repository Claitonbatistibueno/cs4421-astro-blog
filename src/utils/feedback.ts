export interface Feedback {
  name: string;
  message: string;
}

export type FeedbackResult = { ok: true; value: Feedback } | { ok: false; error: string };

/** Validates the body of POST /api/feedback. */
export function validateFeedback(body: unknown): FeedbackResult {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Body must be an object' };
  const { name, message } = body as Record<string, unknown>;
  if (typeof message !== 'string' || message.trim().length < 3) {
    return { ok: false, error: 'message must have at least 3 characters' };
  }
  if (message.length > 1000) return { ok: false, error: 'message must have at most 1000 characters' };
  const cleanName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 100) : 'anonymous';
  return { ok: true, value: { name: cleanName, message: message.trim() } };
}
