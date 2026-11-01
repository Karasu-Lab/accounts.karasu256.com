/**
 * Regression tests for the linking page's linked-state judgment.
 *
 * The page judges the linked state solely by auth.karasu256.com's
 * provider profile API: a provider counts as linked exactly when a
 * profile comes back for it (see ./page.tsx). Linked providers were
 * reported as not linked when that API did not return profiles, so
 * this contract is pinned down end to end — the real page, the real
 * profile fetch, and the real server-side session resolution, against
 * a stub of the auth API that returns a profile for the linked
 * provider (GitHub) and 404 for the unlinked one (Google):
 *
 * 1. The page hands the client section an initial profile for the
 *    linked provider and null for the unlinked one.
 * 2. Without a signed-in user, no profiles are fetched and every
 *    provider starts unlinked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestCookie: { value: string | null } = { value: 'better-auth.session_token=test-session-token' };

vi.mock('next/headers', () => ({
  headers: async () => new Headers(requestCookie.value ? { cookie: requestCookie.value } : {}),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock('@karasu-lab/utils/server', async () => {
  const signature = await import('@karasu-lab/utils/server/request-signature');
  const bypass = await import('@karasu-lab/utils/server/vercel-bypass');

  class MissingEnvError extends Error {
    readonly variableName: string;
    constructor(variableName: string) {
      super(`Missing required environment variable: ${variableName}`);
      this.name = 'MissingEnvError';
      this.variableName = variableName;
    }
  }

  return {
    signRequest: signature.signRequest,
    verifyRequest: signature.verifyRequest,
    vercelProtectionBypassHeaders: bypass.vercelProtectionBypassHeaders,
    MissingEnvError,
    getRootAppUrl: async () => 'https://app.karasu256.com/',
  };
});

import LinkingPage from './page';

const sessionUser = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };
const githubProfile = { name: 'GitHub User', email: 'github@example.com', image: null };

/** A stub of the two auth services the page reads from, keyed by path. */
function authServicesStub(url: string): Promise<Response> {
  const { pathname } = new URL(url);
  const json = (body: unknown, status: number) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

  if (pathname === '/api/auth/get-session') {
    return requestCookie.value ? json({ user: sessionUser, session: { id: 'session-1', userId: sessionUser.id } }, 200) : json(null, 200);
  }
  if (pathname === '/api/users/me/providers/github/details') {
    return requestCookie.value ? json(githubProfile, 200) : json({ error: 'Unauthorized' }, 401);
  }
  if (pathname === '/api/users/me/providers/google/details') {
    return requestCookie.value ? json({ error: 'Not Found' }, 404) : json({ error: 'Unauthorized' }, 401);
  }
  return json({ error: 'Not Found' }, 404);
}

describe('linking page linked-state judgment', () => {
  beforeEach(() => {
    requestCookie.value = 'better-auth.session_token=test-session-token';
    vi.stubEnv('AUTH_API_URL', 'https://api-auth.karasu256.com');
    vi.stubEnv('AUTH_URL', 'https://auth.karasu256.com');
    vi.stubGlobal('fetch', vi.fn(authServicesStub));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('marks a provider as linked exactly when its profile comes back', async () => {
    const element = await LinkingPage();

    expect((element.props as { initialProfiles: unknown }).initialProfiles).toEqual({
      google: null,
      github: githubProfile,
      microsoft: null,
      minecraft: null,
    });
  });

  it('fetches no profiles without a signed-in user', async () => {
    requestCookie.value = null;

    const element = await LinkingPage();

    expect((element.props as { initialProfiles: unknown }).initialProfiles).toEqual({});
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('/details'))).toBe(false);
  });
});
