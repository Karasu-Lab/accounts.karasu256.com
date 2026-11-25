import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { multiSession } from 'better-auth/plugins';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proxy } from './proxy';

async function signUpSetCookies(cookiePrefix: string, cookieDomain?: string): Promise<string[]> {
  const auth = betterAuth({
    baseURL: 'https://dev-api-auth.karasu256.com',
    secret: 'a-secret-that-is-long-enough-for-better-auth',
    database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    emailAndPassword: { enabled: true },
    plugins: [multiSession({ maximumSessions: 5 })],
    advanced: {
      cookiePrefix,
      crossSubDomainCookies: { enabled: Boolean(cookieDomain), domain: cookieDomain },
    },
  });
  const response = await auth.api.signUpEmail({
    body: { email: 'user@example.test', password: 'a-long-enough-password', name: 'user' },
    asResponse: true,
  });
  return response.headers.getSetCookie();
}

function cookieHeaderFor(setCookies: string[], requestHost: string): string {
  return setCookies
    .filter((setCookie) => {
      const domain = /;\s*Domain=([^;]+)/i.exec(setCookie)?.[1]?.replace(/^\./, '');
      return domain ? requestHost === domain || requestHost.endsWith(`.${domain}`) : requestHost === 'dev-api-auth.karasu256.com';
    })
    .map((setCookie) => setCookie.split(';')[0])
    .join('; ');
}

function settingsRequest(cookie: string): NextRequest {
  return new NextRequest('https://fix-session-cookie-name-from-app-env.dev-accounts.karasu256.com/settings', {
    headers: cookie ? { cookie } : {},
  });
}

describe('proxy session detection', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_URL', 'https://dev-auth.karasu256.com');
    vi.stubEnv('AUTH_API_URL', 'https://dev-api-auth.karasu256.com');
    vi.stubEnv('APP_ENV', 'preview');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('redirects a request without a session cookie to sign-in', () => {
    const response = proxy(settingsRequest(''));
    expect(response.headers.get('location')).toContain('https://dev-auth.karasu256.com/sign-in');
  });

  it('lets a request through when the cookie is shared across the subdomains', async () => {
    const setCookies = await signUpSetCookies('preview', 'karasu256.com');
    const cookie = cookieHeaderFor(setCookies, 'fix-session-cookie-name-from-app-env.dev-accounts.karasu256.com');
    expect(proxy(settingsRequest(cookie)).headers.get('location')).toBeNull();
  });

  it('sends the user back to sign-in when the cookie is host-only, which is the redirect loop', async () => {
    const setCookies = await signUpSetCookies('preview');
    expect(cookieHeaderFor(setCookies, 'dev-api-auth.karasu256.com')).not.toBe('');
    const cookie = cookieHeaderFor(setCookies, 'fix-session-cookie-name-from-app-env.dev-accounts.karasu256.com');
    expect(proxy(settingsRequest(cookie)).headers.get('location')).toContain('https://dev-auth.karasu256.com/sign-in');
  });
});
