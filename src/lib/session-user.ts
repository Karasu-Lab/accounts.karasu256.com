import { createHash } from 'node:crypto';
import { cache } from 'react';
import { headers } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { getSessionCookie } from 'better-auth/cookies';
import { vercelProtectionBypassHeaders } from '@karasu-lab/utils/server';
import type { SessionUser } from '@karasu-lab/types/shared';

export type { SessionUser };

async function fetchSessionUser(cookie: string): Promise<SessionUser> {
  const res = await fetch(`${process.env.AUTH_API_URL ?? ''}/api/auth/get-session`, {
    headers: {
      cookie,
      ...vercelProtectionBypassHeaders(process.env.VERCEL_PROTECTION_BYPASS_SECRET),
    },
  });
  if (!res.ok) throw new Error(`get-session responded ${res.status}`);

  const data = (await res.json()) as { user?: { id: string; email?: string | null; name?: string | null; image?: string | null } } | null;
  if (!data?.user) throw new Error('No session');
  return { id: data.user.id, email: data.user.email ?? null, name: data.user.name ?? null, image: data.user.image ?? null };
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const requestHeaders = await headers();
  const sessionCookie = getSessionCookie(requestHeaders);
  if (!sessionCookie) return null;

  const cookie = requestHeaders.get('cookie') ?? '';
  const cookieHash = createHash('sha256').update(sessionCookie).digest('hex');
  return unstable_cache(() => fetchSessionUser(cookie), ['session-user', cookieHash], { revalidate: 30 })().catch(() => null);
});
