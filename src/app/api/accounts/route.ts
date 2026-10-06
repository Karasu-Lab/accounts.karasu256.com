import { NextRequest, NextResponse } from 'next/server';
import { listDeviceSessions } from '@/lib/auth/device-sessions';
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
 * Lists every account in better-auth's `multiSession` device session list on auth.karasu256.com.
 *
 * GET /api/accounts
 */
async function handleGET(request: NextRequest) {
  const deviceSessions = await listDeviceSessions(request);

  const accounts: AccountSummary[] = deviceSessions.map((entry) => ({
    uid: entry.user.id,
    sessionToken: entry.session.token,
    displayName: entry.user.name ?? null,
    email: entry.user.email ?? null,
    photoURL: entry.user.image ?? null,
    addedAt: new Date(entry.session.createdAt).toISOString(),
  }));

  const activeUser = await getSessionUser();
  return NextResponse.json({ activeUid: activeUser?.id ?? null, accounts });
}

export const GET = withCors(handleGET);
export const OPTIONS = handlePreflight;
