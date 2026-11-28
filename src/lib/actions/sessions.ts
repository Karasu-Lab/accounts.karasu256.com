'use server';

import { headers } from 'next/headers';
import { getSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';
import { vercelProtectionBypassHeaders } from '@karasu-lab/utils/server';
import { fetchActiveSessions, fetchRevokeActiveSession } from '@/lib/api/internal';
import { sessionSourceParseSchema, type ActiveSessionListItem } from '@/lib/session-schemas';

const currentSessionSchema = z.object({
  session: z.object({ id: z.string().min(1) }),
  user: z.object({ id: z.string().min(1) }),
});

type CurrentSession = z.infer<typeof currentSessionSchema>;

async function fetchCurrentSession(): Promise<CurrentSession | null> {
  const requestHeaders = await headers();
  if (!getSessionCookie(requestHeaders, { cookiePrefix: process.env.APP_ENV })) return null;

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

export async function loadActiveSessions(): Promise<ActiveSessionListItem[]> {
  const current = await fetchCurrentSession();
  if (!current) throw new Error('api-auth.karasu256.com did not return the current session');
  const sessions = await fetchActiveSessions(current.user.id);
  return sessions.map((session) => {
    const parsed = session.source ? sessionSourceParseSchema.safeParse({ source: session.source, sessionId: session.id }) : null;
    const providerId = parsed?.success ? parsed.data.providerId : null;
    return {
      ...session,
      source: providerId && session.source ? { raw: session.source, providerId } : null,
    };
  });
}

export async function revokeActiveSession(sessionId: string): Promise<void> {
  const current = await fetchCurrentSession();
  if (!current) throw new Error('api-auth.karasu256.com did not return the current session');
  const revoked = await fetchRevokeActiveSession(current.user.id, sessionId);
  if (!revoked) throw new Error(`api.karasu256.com did not revoke the session ${sessionId}`);
}
