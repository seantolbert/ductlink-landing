import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '../env';
import { serverEnv } from '../server-env';

/**
 * Supabase with the secret key. Bypasses RLS, so every caller checks access
 * itself first. Used only for: creating a shop, inviting staff, and the
 * Stripe webhook writing shop_billing.
 */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, serverEnv.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
