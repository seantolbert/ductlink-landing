// Environment, read in one place. NEXT_PUBLIC_* values are inlined into the
// browser bundle; everything else is server-only (see ./server-env.ts).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** The ordering app (v1), e.g. https://app.ductlink.com. No trailing slash. */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://ductlink.vercel.app').replace(/\/$/, '');

/** A shop's order link, the URL techs open on their phones. */
export function orderLink(slug: string): string {
  return `${APP_URL}/s/${slug}`;
}

/** The shop inbox in the app. */
export const INBOX_URL = `${APP_URL}/shop`;
