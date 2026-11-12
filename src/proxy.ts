import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refreshes the Supabase session cookie before signed-in pages and API routes
// render, and sends signed-out visitors on those pages to /login. Marketing
// pages, /learn, and static files never run this.

const PROTECTED = ['/onboarding', '/account'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims verifies the JWT and refreshes an expired session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/onboarding/:path*', '/account/:path*', '/api/((?!stripe/webhook|slug-check).*)'],
};
