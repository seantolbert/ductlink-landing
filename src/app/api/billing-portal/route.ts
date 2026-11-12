import { getOwnerShop } from '@/lib/auth';
import { json, requireOwner, sameOrigin } from '@/lib/http';
import { siteOrigin } from '@/lib/server-env';
import { stripe } from '@/lib/stripe';
import { adminClient } from '@/lib/supabase/admin';

/** POST /api/billing-portal -> { url }: Stripe's hosted page for card, plan, invoices, cancel. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json(403, { error: 'Forbidden.' });
  const owner = await requireOwner();
  if (owner instanceof Response) return owner;
  const shop = await getOwnerShop(owner);
  if (!shop) return json(409, { error: 'Create your shop first.' });
  const { data } = await adminClient().from('shop_billing').select('stripe_customer_id').eq('shop_id', shop.id).maybeSingle();
  if (!data?.stripe_customer_id) return json(409, { error: 'Start your trial first.' });
  const portal = await stripe().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${siteOrigin(request)}/account` });
  return json(200, { url: portal.url });
}
