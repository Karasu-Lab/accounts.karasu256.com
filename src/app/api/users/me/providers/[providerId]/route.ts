import { NextRequest, NextResponse } from 'next/server';
import { fetchUnlinkProvider } from '@/lib/api/internal';
import { requireSession } from '@/lib/api/require-session';

/**
 * Unlinks a third-party provider from the authenticated user's account.
 * The deletion itself is performed by api.karasu256.com, which owns the
 * database access; this route only forwards the session's user.
 *
 * DELETE /api/users/me/providers/[providerId]
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ providerId: string }> }) {
  const { user, error } = await requireSession();
  if (error) return error;

  const { providerId } = await params;
  const removed = await fetchUnlinkProvider(user.id, providerId);

  if (!removed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
