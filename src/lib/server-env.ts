import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

export const serverEnv = {
  supabaseSecretKey: () => required('SUPABASE_SECRET_KEY'),
  stripeSecretKey: () => required('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: () => required('STRIPE_WEBHOOK_SECRET'),
  priceMonthly: () => required('STRIPE_PRICE_MONTHLY'),
  priceYearly: () => required('STRIPE_PRICE_YEARLY'),
};

/**
 * This site's own origin, for redirects back from Stripe and auth emails.
 * Taken from the request so preview deploys return to themselves.
 */
export function siteOrigin(request: Request): string {
  return new URL(request.url).origin;
}
