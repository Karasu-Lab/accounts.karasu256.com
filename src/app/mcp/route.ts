import { getSessionUser } from '@/lib/session-user';
import { handleMcpMessage } from '@/lib/mcp/server';
import { resolveUserFromAccessToken, resolveUserFromSessionToken } from '@/lib/mcp/session';

export async function POST(request: Request): Promise<Response> {
  let message: unknown;
  try {
    message = await request.json();
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 });
  }

  let user = await getSessionUser().catch(() => null);
  const authorization = request.headers.get('authorization');
  if (!user && authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length);
    user =
      (await resolveUserFromAccessToken(token).catch(() => null)) ??
      (await resolveUserFromSessionToken(token).catch(() => null));
  }
  if (!user) {
    return Response.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } },
      { status: 401, headers: { 'www-authenticate': 'Bearer' } },
    );
  }

  const response = await handleMcpMessage(message, { user, cookieHeader: request.headers.get('cookie') });
  if (!response.body) return new Response(null, { status: response.status });

  const init: ResponseInit = { status: response.status, headers: { 'content-type': 'application/json' } };
  if (response.status === 401) {
    (init.headers as Record<string, string>)['www-authenticate'] = 'Bearer';
  }
  return Response.json(response.body, init);
}

export async function GET(): Promise<Response> {
  return Response.json({ error: 'Method Not Allowed' }, { status: 405, headers: { allow: 'POST' } });
}
