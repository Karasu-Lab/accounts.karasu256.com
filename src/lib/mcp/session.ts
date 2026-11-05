import type { SessionUser } from '@/lib/session-user';

export async function resolveUserFromAccessToken(token: string): Promise<SessionUser | null> {
  const authApiUrl = process.env.AUTH_API_URL;
  if (!authApiUrl) return null;

  const res = await fetch(`${authApiUrl}/api/auth/oauth2/userinfo`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;

  const data = (await res.json().catch(() => null)) as {
    sub?: string;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
  } | null;
  if (!data?.sub) return null;
  return { id: data.sub, email: data.email ?? null, name: data.name ?? null, image: data.picture ?? null };
}

export async function resolveUserFromSessionToken(token: string): Promise<SessionUser | null> {
  const authApiUrl = process.env.AUTH_API_URL;
  if (!authApiUrl) return null;

  for (const cookieName of ['better-auth.session_token', '__Secure-better-auth.session_token']) {
    const res = await fetch(`${authApiUrl}/api/auth/get-session`, {
      headers: { cookie: `${cookieName}=${token}` },
      cache: 'no-store',
    }).catch(() => null);
    if (!res?.ok) continue;

    const data = (await res.json().catch(() => null)) as {
      user?: { id: string; email?: string | null; name?: string | null; image?: string | null };
    } | null;
    if (data?.user) {
      return { id: data.user.id, email: data.user.email ?? null, name: data.user.name ?? null, image: data.user.image ?? null };
    }
  }
  return null;
}
