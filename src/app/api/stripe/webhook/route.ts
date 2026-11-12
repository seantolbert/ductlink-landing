import type Stripe from 'stripe';
import { syncSubscription } from '@/lib/billing';
import { serverEnv } from '@/lib/server-env';
import { stripe } from '@/lib/stripe';

const SUBSCRIPTION_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.trial_will_end',
]);

function subscriptionIdOf(event: Stripe.Event): string | null {
  if (SUBSCRIPTION_EVENTS.has(event.type)) return (event.data.object as Stripe.Subscription).id;
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    return typeof s.subscription === 'string' ? s.subscription : (s.subscription?.id ?? null);
  }
  if (event.type === 'invoice.payment_failed' || event.type === 'invoice.paid') {
    const sub = (event.data.object as Stripe.Invoice).parent?.subscription_details?.subscription;
    return typeof sub === 'string' ? sub : (sub?.id ?? null);
  }
  return null;
}

/**
 * Stripe -> shop_billing. Verifies the signature on the raw body, then
 * re-reads the subscription from Stripe (see syncSubscription), which makes
 * replays and out-of-order delivery harmless.
 */
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, serverEnv.stripeWebhookSecret());
  } catch {
    return new Response('Bad signature', { status: 400 });
  }

  const subscriptionId = subscriptionIdOf(event);
  if (!subscriptionId) return new Response('Ignored', { status: 200 });
  try {
    const result = await syncSubscription(subscriptionId);
    if (!result) console.warn(`stripe webhook ${event.id}: no shop for subscription ${subscriptionId}`);
  } catch (err) {
    console.error(`stripe webhook ${event.id} failed`, err);
    // 500 so Stripe retries.
    return new Response('Sync failed', { status: 500 });
  }
  return new Response('ok', { status: 200 });
}
