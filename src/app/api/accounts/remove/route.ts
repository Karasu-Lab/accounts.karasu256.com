import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listDeviceSessions, postMultiSession } from '@/lib/auth/device-sessions';
import { handlePreflight, withCors } from '@/lib/auth/cors';
import { forwardSetCookies } from '@/lib/auth/forward-set-cookies';

const bodySchema = z.object({ sessionToken: z.string().min(1) });

/**
 * Removes an account from this device: revokes its better-auth session,
 * dropping it from the `multiSession` device list.
 *
 * POST /api/accounts/remove
 * Body: { sessionToken: string }
 */
async function handlePOST(request: NextRequest) {
  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'sessionToken required' }, { status: 400 });
  }
  const { sessionToken } = parsedBody.data;

  const deviceSessions = await listDeviceSessions(request);
  const target = deviceSessions.find((entry) => entry.session.token === sessionToken);
  if (!target) {
    return NextResponse.json({ error: 'Unknown session' }, { status: 403 });
  }

  const revokeResponse = await postMultiSession('revoke', request, sessionToken);
  if (!revokeResponse.ok) {
    return NextResponse.json({ error: 'Failed to remove account' }, { status: revokeResponse.status });
  }

  const response = NextResponse.json({ ok: true });
  forwardSetCookies(revokeResponse, response);
  return response;
}

export const POST = withCors(handlePOST);
export const OPTIONS = handlePreflight;
