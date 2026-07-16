import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@Hashibutogarasu/db';
import { accounts } from '@Hashibutogarasu/db/schema';
import { requireSession } from '@/lib/api/require-session';

/**
 * Unlinks a third-party provider from the authenticated user's account.
 * DELETE /api/users/me/providers/[providerId]
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ providerId: string }> }) {
  const { user, error } = await requireSession();
  if (error) return error;

  const { providerId } = await params;
  const db = getDb();
  const result = await db
    .delete(accounts)
    .where(and(eq(accounts.userId, user.id), eq(accounts.providerId, providerId)))
    .returning({ id: accounts.id });

  if (result.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
