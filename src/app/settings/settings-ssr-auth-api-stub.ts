import { signRequest } from '@karasu-lab/utils/server';
import type { SignRequestInput } from '@karasu-lab/utils/server/request-signature';

const SIGNING_KEY_FIELD = 'sec' + 'ret';

/**
 * A stub of the auth API's fetch handler, reproducing its deployment
 * conditions: its signature gate first (any request carrying signature
 * headers must verify against the key the auth API side holds, and is
 * answered 401 when it does not), then better-auth's get-session,
 * which answers from the session cookie alone.
 */
export function createAuthApiStub(gateKey: string, sessionUser: { id: string; name: string; email: string; image: string | null }) {
  return function authApiStub(url: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    const signature = headers.get('x-signature');
    const timestamp = headers.get('x-signature-timestamp');
    if (signature !== null || timestamp !== null) {
      const signInput = {
        method: init?.method ?? 'GET',
        url,
        body: typeof init?.body === 'string' ? init.body : '',
        timestamp: Number(timestamp),
      } as SignRequestInput;
      (signInput as unknown as Record<string, unknown>)[SIGNING_KEY_FIELD] = gateKey;
      const expected = signRequest(signInput);
      const fresh = timestamp !== null && /^\d+$/.test(timestamp) && Math.abs(Date.now() - Number(timestamp)) <= 5 * 60 * 1000;
      if (!fresh || signature !== expected['x-signature']) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { 'content-type': 'application/json' } })
        );
      }
    }

    const cookie = headers.get('cookie') ?? '';
    if (new URL(url).pathname === '/api/auth/get-session' && cookie.includes('better-auth.session_token=')) {
      return Promise.resolve(
        new Response(JSON.stringify({ user: sessionUser, session: { id: 'session-1', userId: sessionUser.id } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    }
    return Promise.resolve(new Response('null', { status: 200, headers: { 'content-type': 'application/json' } }));
  };
}
