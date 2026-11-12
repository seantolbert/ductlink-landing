'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../env';

let client: SupabaseClient | undefined;

/** Supabase in the browser, as the signed-in owner. RLS applies. */
export function browserClient(): SupabaseClient {
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}
