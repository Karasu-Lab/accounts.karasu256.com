import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createApiKey, listApiKeys, UnknownPermissionError } from '@/lib/api-keys';
import { requireSession } from '@/lib/api/require-session';
import { badRequest } from '@/lib/api/responses';
import { handlePreflight, withCors } from '@/lib/auth/cors';

const createBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  permissions: z.array(z.string().min(1)).default([]),
});

/**
 * Lists the authenticated user's API keys with their granted permissions.
 *
 * GET /api/api-keys
 */
async function handleGET() {
  const { user, error } = await requireSession();
  if (error) return error;

  return NextResponse.json(await listApiKeys(user.id));
}

/**
 * Issues an API key granted the permissions identified by their public ids. The raw key is only returned here.
 *
 * POST /api/api-keys
 * Body: { name: string, permissions?: string[] }
 */
async function handlePOST(request: NextRequest) {
  const { user, error } = await requireSession();
  if (error) return error;

  const parsed = createBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  try {
    const created = await createApiKey(user.id, parsed.data.name, parsed.data.permissions);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof UnknownPermissionError) return badRequest();
    throw err;
  }
}

export const GET = withCors(handleGET);
export const POST = withCors(handlePOST);
export const OPTIONS = handlePreflight;
