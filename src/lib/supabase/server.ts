import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../env';

/**
 * Supabase as the signed-in owner, from their session cookie. RLS applies.
 * Create one per request.
 */
export async function serverClient() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session on the next request instead.
        }
      },
    },
  });
}
