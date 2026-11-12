import 'server-only';
import { getOwner, type Owner } from './auth';

export function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** The signed-in user, or a 401 Response to return. */
export async function requireOwner(): Promise<Owner | Response> {
  const owner = await getOwner();
  return owner ?? json(401, { error: 'Sign in again to continue.' });
}

/** A small JSON object body, or a Response to return. */
export async function readBody(request: Request, maxBytes = 8 * 1024): Promise<Record<string, unknown> | Response> {
  if (!request.headers.get('content-type')?.includes('application/json')) return json(415, { error: 'Expected JSON.' });
  const text = await request.text();
  if (text.length > maxBytes) return json(413, { error: 'Request is too large.' });
  try {
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { error: 'Request could not be read.' });
    return body as Record<string, unknown>;
  } catch {
    return json(400, { error: 'Request could not be read.' });
  }
}

/** Reject cross-site form posts: the browser sends Origin on every POST. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin === null || origin === new URL(request.url).origin;
}
