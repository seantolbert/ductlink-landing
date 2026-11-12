import 'server-only';
import type Stripe from 'stripe';
import type { BillingStatus } from './shop';
import { adminClient } from './supabase/admin';
import { stripe } from './stripe';

const ts = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000).toISOString() : null);

/**
 * Write a subscription's current state to shop_billing. Always re-reads the
 * subscription from Stripe rather than trusting an event payload, so events
 * arriving late, twice, or out of order all converge on the same row.
 */
export async function syncSubscription(subscriptionId: string): Promise<{ shopId: string; status: BillingStatus } | null> {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const db = adminClient();

  let shopId = sub.metadata.shop_id || null;
  if (!shopId) {
    const { data } = await db.from('shop_billing').select('shop_id').eq('stripe_customer_id', customerId).maybeSingle();
    shopId = data?.shop_id ?? null;
  }
  if (!shopId) return null;

  const item = sub.items.data[0] as Stripe.SubscriptionItem | undefined;
  const status = sub.status as BillingStatus;
  const { error } = await db.from('shop_billing').upsert({
    shop_id: shopId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status,
    price_id: item?.price.id ?? null,
    trial_ends_at: ts(sub.trial_end),
    current_period_end: ts(item?.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end,
  });
  if (error) throw new Error(`shop_billing upsert failed: ${error.message}`);
  return { shopId, status };
}

/** The Stripe customer for a shop, created on first checkout. */
export async function customerFor(shopId: string, email: string, shopName: string): Promise<{ customerId: string; hadSubscription: boolean }> {
  const db = adminClient();
  const { data } = await db.from('shop_billing').select('stripe_customer_id, stripe_subscription_id').eq('shop_id', shopId).maybeSingle();
  if (data?.stripe_customer_id) return { customerId: data.stripe_customer_id, hadSubscription: Boolean(data.stripe_subscription_id) };

  const customer = await stripe().customers.create(
    { email, name: shopName, metadata: { shop_id: shopId } },
    // Two quick clicks create one customer, not two.
    { idempotencyKey: `customer-${shopId}` },
  );
  const { error } = await db.from('shop_billing').upsert({ shop_id: shopId, stripe_customer_id: customer.id });
  if (error) throw new Error(`shop_billing upsert failed: ${error.message}`);
  return { customerId: customer.id, hadSubscription: false };
}
