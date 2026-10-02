import { NextResponse, type NextRequest } from 'next/server';
import { deleteApiKey } from '@/lib/api-keys';
import { requireSession } from '@/lib/api/require-session';
import { notFound } from '@/lib/api/responses';
import { handlePreflight, withCors } from '@/lib/auth/cors';

/**
 * Deletes one of the authenticated user's API keys along with its permission grants.
 *
 * DELETE /api/api-keys/:id
 */
async function handleDELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  if (!(await deleteApiKey(user.id, id))) return notFound();
  return new NextResponse(null, { status: 204 });
}

export const DELETE = withCors(handleDELETE);
export const OPTIONS = handlePreflight;
