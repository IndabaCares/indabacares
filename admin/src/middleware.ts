import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPER_ADMIN_ONLY = ['/audit-logs', '/settings'];

// ── Security headers applied to every response ────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  // Prevent clickjacking
  'X-Frame-Options':           'DENY',
  // Prevent MIME-type sniffing
  'X-Content-Type-Options':    'nosniff',
  // Stop sending the Referer header to cross-origin requests
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  // Disable features not needed by the admin portal
  'Permissions-Policy':        'camera=(), microphone=(), geolocation=(), payment=()',
  // Force HTTPS in production (30-day max-age, include subdomains)
  'Strict-Transport-Security': 'max-age=2592000; includeSubDomains',
  // Minimal CSP: allow same-origin + Supabase API/auth origins
  // Tighten in production by removing 'unsafe-inline' and specifying exact CDN hosts.
  'Content-Security-Policy':   [
    "default-src 'self'",
    "script-src  'self' 'unsafe-inline' 'unsafe-eval'",   // Next.js requires these in dev
    "style-src   'self' 'unsafe-inline'",
    "img-src     'self' data: blob: https:",
    "font-src    'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri    'self'",
  ].join('; '),
};

function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// ── Middleware ─────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Validates the session server-side on every request.
  // getUser() calls Supabase Auth — it cannot be spoofed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Route: unauthenticated → login ────────────────────────────────────────

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  // ── Route: authenticated on login → dashboard ────────────────────────────

  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  // ── Role guard ────────────────────────────────────────────────────────────

  if (user) {
    const role = user.app_metadata?.role as string | undefined;

    if (role !== 'admin' && role !== 'super_admin') {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'unauthorized');
      return addSecurityHeaders(NextResponse.redirect(url));
    }

    // Super-admin-only pages
    if (
      SUPER_ADMIN_ONLY.some((p) => request.nextUrl.pathname.startsWith(p)) &&
      role !== 'super_admin'
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return addSecurityHeaders(NextResponse.redirect(url));
    }
  }

  return addSecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
