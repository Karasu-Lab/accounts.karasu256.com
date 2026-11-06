'use server';

import { headers } from 'next/headers';
import { getSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';
import { vercelProtectionBypassHeaders } from '@karasu-lab/utils/server';
import { fetchActiveSessions, fetchRevokeActiveSession, type ActiveSession } from '@/lib/api/internal';

const currentSessionSchema = z.object({
  session: z.object({ id: z.string().min(1) }),
  user: z.object({ id: z.string().min(1) }),
});

type CurrentSession = z.infer<typeof currentSessionSchema>;

async function fetchCurrentSession(): Promise<CurrentSession | null> {
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

  const parsed = currentSessionSchema.safeParse(await res.json().catch(() => null));
  return parsed.success ? parsed.data : null;
}

export async function loadActiveSessions(): Promise<ActiveSession[]> {
  const current = await fetchCurrentSession();
  if (!current) throw new Error('api-auth.karasu256.com did not return the current session');
  const sessions = await fetchActiveSessions(current.user.id);
  return sessions.map((session) => ({ ...session, current: session.id === current.session.id }));
}

export async function revokeActiveSession(sessionId: string): Promise<void> {
  const current = await fetchCurrentSession();
  if (!current) throw new Error('api-auth.karasu256.com did not return the current session');
  if (sessionId === current.session.id) throw new Error('The current session cannot be revoked');
  const revoked = await fetchRevokeActiveSession(current.user.id, sessionId);
  if (!revoked) throw new Error(`api.karasu256.com did not revoke the session ${sessionId}`);
}
