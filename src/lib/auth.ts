import 'server-only';
import { parseContact, parseGauges, type BillingStatus, type ContactMethod, type Gauge } from './shop';
import { serverClient } from './supabase/server';

export interface Owner {
  userId: string;
  email: string;
}

export interface OwnerShop {
  id: string;
  slug: string;
  name: string;
  orderPrefix: string;
  logoUrl: string | null;
  brandColor: string | null;
  contact: ContactMethod[];
  gauges: Gauge[];
  notifyEmails: string[];
  onboardedAt: string | null;
  billing: {
    status: BillingStatus;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    hasCustomer: boolean;
  };
}

/**
 * The signed-in user, verified (getClaims checks the JWT signature), or null.
 * Reads cookies: render callers behind <Suspense>.
 */
export async function getOwner(): Promise<Owner | null> {
  const supabase = await serverClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { userId: claims.sub, email: typeof claims.email === 'string' ? claims.email : '' };
}

interface MembershipRow {
  shops: {
    id: string;
    slug: string;
    name: string;
    order_prefix: string;
    logo_url: string | null;
    brand_color: string | null;
    contact: unknown;
    settings: unknown;
    shop_private: { notify_emails: string[]; onboarded_at: string | null } | null;
    shop_billing: {
      status: BillingStatus;
      trial_ends_at: string | null;
      current_period_end: string | null;
      cancel_at_period_end: boolean;
      stripe_customer_id: string | null;
    } | null;
  } | null;
}

/**
 * The shop this user owns, read through their own session (RLS limits it to
 * their membership). Null when they haven't created one yet.
 */
export async function getOwnerShop(owner: Owner): Promise<OwnerShop | null> {
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from('shop_members')
    .select(
      'shops(id, slug, name, order_prefix, logo_url, brand_color, contact, settings, shop_private(notify_emails, onboarded_at), shop_billing(status, trial_ends_at, current_period_end, cancel_at_period_end, stripe_customer_id))',
    )
    .eq('user_id', owner.userId)
    .eq('role', 'owner')
    .order('created_at')
    .limit(1)
    .maybeSingle<MembershipRow>();
  if (error) throw new Error(`Couldn't load shop: ${error.message}`);
  const s = data?.shops;
  if (!s) return null;
  const b = s.shop_billing;
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    orderPrefix: s.order_prefix,
    logoUrl: s.logo_url,
    brandColor: s.brand_color,
    contact: parseContact(s.contact),
    gauges: parseGauges(s.settings),
    notifyEmails: s.shop_private?.notify_emails ?? [],
    onboardedAt: s.shop_private?.onboarded_at ?? null,
    billing: {
      status: b?.status ?? 'none',
      trialEndsAt: b?.trial_ends_at ?? null,
      currentPeriodEnd: b?.current_period_end ?? null,
      cancelAtPeriodEnd: b?.cancel_at_period_end ?? false,
      hasCustomer: Boolean(b?.stripe_customer_id),
    },
  };
}
