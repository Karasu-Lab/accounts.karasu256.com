import { headers } from 'next/headers';
import { getSessionCookie } from 'better-auth/cookies';
import { vercelProtectionBypassHeaders } from '@karasu-lab/utils/server';
import type { SessionUser } from '@karasu-lab/types/shared';

export type { SessionUser };

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
