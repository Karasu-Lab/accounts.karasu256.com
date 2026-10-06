import { type NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { firebaseConfigSchema } from '@/lib/firebase/schema';

/**
 * Next.js 16 proxy (formerly middleware) that:
 * 1. Validates all required Firebase environment variables on every request.
 * 2. Redirects unauthenticated requests for / and /settings to auth.karasu256.com's sign-in page.
 * 3. Redirects authenticated requests for / to /settings.
 *
 * A request counts as authenticated if the better-auth session cookie is
 * present, checked via `getSessionCookie()` — this app no longer overrides
 * better-auth's own session cookie naming, so the helper's default lookup
 * (accounting for the `__Secure-` prefix under HTTPS) matches directly.
 *
 * Cookie verification (signature + expiry) is intentionally skipped here because
 * the Firebase Admin SDK is not Edge-runtime compatible. Full verification is
 * performed inside each protected API route and server component as needed.
 */
export function proxy(request: NextRequest): NextResponse {
  const configResult = firebaseConfigSchema.safeParse({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  });

  if (!configResult.success) {
    return new NextResponse(JSON.stringify({ error: 'Firebase configuration is invalid', issues: configResult.error.issues }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (hasSession && pathname === '/') {
    return NextResponse.redirect(new URL('/settings', request.url));
  }

  if (!hasSession && (pathname === '/' || pathname.startsWith('/settings'))) {
    const target = pathname === '/' ? new URL('/settings', request.url) : request.nextUrl;
    const signIn = new URL('/sign-in', process.env.NEXT_PUBLIC_AUTH_URL);
    signIn.searchParams.set('redirectTo', target.toString());
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

/** Apply this middleware to all non-static routes. */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
