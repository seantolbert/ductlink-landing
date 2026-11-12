import { getOwnerShop } from '@/lib/auth';
import { syncSubscription } from '@/lib/billing';
import { json, readBody, requireOwner, sameOrigin } from '@/lib/http';
import { stripe } from '@/lib/stripe';

/**
 * POST /api/checkout/sync { sessionId } -> { status }
 * Called on return from Checkout so the next screen doesn't wait on the
 * webhook. Writes the same row the webhook would.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json(403, { error: 'Forbidden.' });
  const owner = await requireOwner();
  if (owner instanceof Response) return owner;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId.startsWith('cs_')) return json(400, { error: 'Unknown checkout.' });

  const shop = await getOwnerShop(owner);
  if (!shop) return json(409, { error: 'Create your shop first.' });
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== shop.id) return json(403, { error: 'That checkout belongs to another shop.' });
  const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!subId) return json(200, { status: shop.billing.status });
  const synced = await syncSubscription(subId);
  return json(200, { status: synced?.status ?? shop.billing.status });
}
