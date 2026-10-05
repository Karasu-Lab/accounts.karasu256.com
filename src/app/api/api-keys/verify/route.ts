import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyApiKey } from '@/lib/api-keys';
import { badRequest, unauthorized } from '@/lib/api/responses';

const verifyBodySchema = z.object({ key: z.string().min(1) });

/**
 * Verifies a raw API key for api.karasu256.com, returning its owner and id.
 *
 * POST /api/api-keys/verify
 * Body: { key: string }
 */
export async function POST(request: NextRequest) {
  const parsed = verifyBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  const result = await verifyApiKey(parsed.data.key);
  if (!result) return unauthorized();

  return NextResponse.json({ userId: result.userId, keyId: result.keyId });
}
