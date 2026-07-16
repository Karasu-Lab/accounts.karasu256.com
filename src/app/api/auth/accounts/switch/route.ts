import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/server';
import { handlePreflight, withCors } from '@/lib/auth/cors';
import { forwardSetCookies } from '@/lib/auth/forward-set-cookies';

const bodySchema = z.object({ sessionToken: z.string().min(1) });

/**
 * Switches the active account on this device by flipping better-auth's own
 * active `multiSession` session — its cookie is the sole source of truth for
 * "who is logged in" everywhere in this app, so no other client-side sync is
 * needed.
 *
 * POST /api/auth/accounts/switch
 * Body: { sessionToken: string }
 */
async function handlePOST(request: NextRequest) {
  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'sessionToken required' }, { status: 400 });
  }
  const { sessionToken } = parsedBody.data;

  const deviceSessions = await auth.api.listDeviceSessions({ headers: request.headers });
  const target = deviceSessions.find((entry) => entry.session.token === sessionToken);
  if (!target) {
    return NextResponse.json({ error: 'Unknown session' }, { status: 403 });
  }

  const setActiveResponse = await auth.api.setActiveSession({
    headers: request.headers,
    body: { sessionToken },
    asResponse: true,
  });

  const response = NextResponse.json({ ok: true, uid: target.user.id });
  forwardSetCookies(setActiveResponse, response);
  return response;
}

export const POST = withCors(handlePOST);
export const OPTIONS = handlePreflight;
