import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildIssueApiKeyRequest } from '@/lib/api-keys';
import { buildSignedAuthRequest } from '@/lib/auth/remote';

const bodySchema = z.discriminatedUnion('target', [
  z.object({
    target: z.literal('issue-api-key'),
    userId: z.string().min(1),
    name: z.string().min(1),
    dbBranch: z.string().nullable().optional(),
    timestampOffsetMs: z.number().optional(),
  }),
  z.object({
    target: z.literal('get-session'),
    dbBranch: z.string().nullable().optional(),
    timestampOffsetMs: z.number().optional(),
  }),
]);

/**
 * Test-only endpoint for the auth.karasu256.com Playwright suite: returns the
 * exact signed request this app would send to auth, so the suite can replay it
 * unchanged or tampered. Never reachable in production.
 *
 * POST /api/test/signed-request
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  const { dbBranch, timestampOffsetMs } = parsed.data;
  const timestamp = timestampOffsetMs === undefined ? undefined : Date.now() + timestampOffsetMs;

  if (parsed.data.target === 'issue-api-key') {
    return NextResponse.json(buildIssueApiKeyRequest(parsed.data.userId, parsed.data.name, { dbBranch, timestamp }));
  }
  return NextResponse.json(buildSignedAuthRequest('/api/auth/get-session', { cookie: request.headers.get('cookie'), dbBranch, timestamp }));
}
