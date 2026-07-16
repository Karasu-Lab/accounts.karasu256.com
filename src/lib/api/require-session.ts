import { NextResponse } from 'next/server';
import { getSessionUser, type SessionUser } from '@/lib/session-user';
import { unauthorized } from '@/lib/api/responses';

type SessionResult = { user: SessionUser; error: null } | { user: null; error: NextResponse };

/**
 * Reads and verifies the better-auth session.
 * Returns the session's user on success, or a 401 NextResponse on failure.
 * All Route Handlers that require authentication must call this first.
 */
export async function requireSession(): Promise<SessionResult> {
  const user = await getSessionUser();
  if (!user) return { user: null, error: unauthorized() };
  return { user, error: null };
}
