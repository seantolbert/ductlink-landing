import { getOwnerShop } from '@/lib/auth';
import { customerFor } from '@/lib/billing';
import { json, readBody, requireOwner, sameOrigin } from '@/lib/http';
import { siteOrigin } from '@/lib/server-env';
import { LIVE_STATUSES } from '@/lib/shop';
import { priceFor, stripe, TRIAL_DAYS } from '@/lib/stripe';

/**
 * POST /api/checkout { interval: 'month' | 'year' } -> { url }
 * Starts the owner's subscription on Stripe-hosted Checkout. The price comes
 * from server env; the browser only picks monthly or yearly.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json(403, { error: 'Forbidden.' });
  const owner = await requireOwner();
  if (owner instanceof Response) return owner;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const interval = body.interval === 'year' ? 'year' : 'month';

  const shop = await getOwnerShop(owner);
  if (!shop) return json(409, { error: 'Create your shop first.' });
  if (LIVE_STATUSES.has(shop.billing.status)) return json(409, { error: 'Your subscription is already active.', status: shop.billing.status });

  const { customerId, hadSubscription } = await customerFor(shop.id, owner.email, shop.name);
  const origin = siteOrigin(request);
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: shop.id,
    line_items: [{ price: priceFor(interval), quantity: 1 }],
    subscription_data: {
      metadata: { shop_id: shop.id },
      // One free trial per shop.
      ...(hadSubscription ? {} : { trial_period_days: TRIAL_DAYS }),
    },
    metadata: { shop_id: shop.id },
    allow_promotion_codes: true,
    success_url: `${origin}/onboarding/branding?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/onboarding/trial?checkout=cancelled`,
  });
  if (!session.url) return json(502, { error: 'Couldn’t start checkout. Try again.' });
  return json(200, { url: session.url });
}
