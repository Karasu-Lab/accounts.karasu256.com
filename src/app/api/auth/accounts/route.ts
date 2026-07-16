import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getSessionUser } from '@/lib/session-user';
import { handlePreflight, withCors } from '@/lib/auth/cors';

export interface AccountSummary {
  uid: string;
  sessionToken: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  addedAt: string;
}

/**
 * Lists every account bridged into better-auth's `multiSession` device
 * session list, using each session's own `user` row directly — the source
 * of truth for profile info since email/password moved onto better-auth.
 *
 * `activeUid` is `getSessionUser()`'s id — the better-auth session behind
 * the live session cookie (the real source of truth for "who is logged in").
 *
 * GET /api/auth/accounts
 */
async function handleGET(request: NextRequest) {
  const deviceSessions = await auth.api.listDeviceSessions({ headers: request.headers });

  const accounts: AccountSummary[] = deviceSessions.map((entry) => ({
    uid: entry.user.id,
    sessionToken: entry.session.token,
    displayName: entry.user.name ?? null,
    email: entry.user.email ?? null,
    photoURL: entry.user.image ?? null,
    addedAt: entry.session.createdAt.toISOString(),
  }));

  const activeUser = await getSessionUser();
  return NextResponse.json({ activeUid: activeUser?.id ?? null, accounts });
}

export const GET = withCors(handleGET);
export const OPTIONS = handlePreflight;
