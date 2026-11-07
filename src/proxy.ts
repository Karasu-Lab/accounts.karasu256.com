import { type NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { buildUriWithNext } from '@karasu-lab/utils/uri';

/**
 * Returns the origin the client used to reach this app. The dev server reports its own
 * `localhost` origin in `request.url` when requests arrive through a tunnel or reverse proxy,
 * so the forwarded host and protocol headers take precedence.
 */
function getPublicOrigin(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return request.nextUrl.origin;
  const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? request.nextUrl.protocol.replace(':', '');
  return `${protocol}://${host}`;
}

/**
 * Next.js 16 proxy (formerly middleware).
 *
 * A request counts as authenticated if the better-auth session cookie is
 * present, checked via `getSessionCookie()` — this app no longer overrides
 * better-auth's own session cookie naming, so the helper's default lookup
 * (accounting for the `__Secure-` prefix under HTTPS) matches directly.
 *
 * Cookie verification (signature + expiry) is intentionally skipped here. Full
 * verification is performed inside each protected API route and server
 * component as needed.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (pathname === '/.well-known/oauth-authorization-server' || pathname === '/.well-known/openid-configuration') {
    return NextResponse.rewrite(new URL(`/api/auth${pathname}`, process.env.AUTH_API_URL));
  }

  const hasSession = Boolean(getSessionCookie(request));
  const publicOrigin = getPublicOrigin(request);

  if (hasSession && pathname === '/') {
    return NextResponse.redirect(new URL('/settings', publicOrigin));
  }

  if (!hasSession && (pathname === '/' || pathname.startsWith('/settings'))) {
    const target = pathname === '/' ? new URL('/settings', publicOrigin) : new URL(`${pathname}${search}`, publicOrigin);
    const signIn = buildUriWithNext(new URL('/sign-in', process.env.AUTH_URL).toString(), target.toString());
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

/** Apply this middleware to all non-static routes. */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
