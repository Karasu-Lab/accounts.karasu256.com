import { headers } from 'next/headers';
import { getSessionCookie } from 'better-auth/cookies';
import { buildSignedAuthRequest, sendSignedAuthRequest } from '@/lib/auth/remote';

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const requestHeaders = await headers();
  if (!getSessionCookie(requestHeaders)) return null;

  const res = await sendSignedAuthRequest(buildSignedAuthRequest('/api/auth/get-session', { cookie: requestHeaders.get('cookie') })).catch(
    () => null
  );
  if (!res?.ok) return null;

  const data = (await res.json()) as { user?: { id: string; email?: string | null; name?: string | null; image?: string | null } } | null;
  if (!data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? null, name: data.user.name ?? null, image: data.user.image ?? null };
}
