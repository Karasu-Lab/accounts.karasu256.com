import { headers } from 'next/headers';
import { getSessionCookie } from 'better-auth/cookies';
import { vercelProtectionBypassHeaders } from '@karasu-lab/utils/server';

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

/**
 * Resolves the signed-in user on the server so the settings pages can
 * render the account with the first paint instead of waiting for the
 * client-side session.
 *
 * The session is read from the auth API's get-session endpoint with
 * the request's session cookie alone — the same call the browser's
 * session client makes. It is deliberately not signed: get-session
 * authenticates by the session cookie itself, and signing would make
 * this read depend on the two deployments' shared-secret configuration
 * staying in sync, whose mismatch silently degraded the server render
 * to "no account" (the profile item popping in after the client-side
 * session loaded).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const requestHeaders = await headers();
  if (!getSessionCookie(requestHeaders)) return null;

  const res = await fetch(`${process.env.AUTH_API_URL ?? ''}/api/auth/get-session`, {
    headers: {
      cookie: requestHeaders.get('cookie') ?? '',
      ...vercelProtectionBypassHeaders(process.env.VERCEL_PROTECTION_BYPASS_SECRET),
    },
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;

  const data = (await res.json()) as { user?: { id: string; email?: string | null; name?: string | null; image?: string | null } } | null;
  if (!data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? null, name: data.user.name ?? null, image: data.user.image ?? null };
}
