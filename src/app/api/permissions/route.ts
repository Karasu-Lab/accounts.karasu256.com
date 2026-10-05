import { NextResponse } from 'next/server';
import { listActivePermissions } from '@/lib/api/api-client';
import { requireSession } from '@/lib/api/require-session';
import { handlePreflight, withCors } from '@/lib/auth/cors';

/**
 * Lists the permissions that can be granted to an API key.
 *
 * GET /api/permissions
 */
async function handleGET() {
  const { error } = await requireSession();
  if (error) return error;

  return NextResponse.json(await listActivePermissions());
}

export const GET = withCors(handleGET);
export const OPTIONS = handlePreflight;
