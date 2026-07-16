import { headers } from 'next/headers';
import { auth } from '@/lib/auth/server';

/** The authenticated user, as returned by `auth.api.getSession`. */
export type SessionUser = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>['user'];

/**
 * Reads and verifies the better-auth session.
 * Returns the session's user when valid, or `null` when absent or invalid.
 *
 * Must only be called from Server Components or Route Handlers.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
