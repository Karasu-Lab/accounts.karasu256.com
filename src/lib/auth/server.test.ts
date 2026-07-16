import { betterAuth } from 'better-auth';
import { passkey } from '@better-auth/passkey';
import { oauthProvider } from '@better-auth/oauth-provider';
import { jwt } from 'better-auth/plugins/jwt';
import { multiSession, testUtils } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { authOptions } from '@/lib/auth/auth-options';
import { getServerConfig } from '@/lib/config';

const { webauthn } = getServerConfig();

/**
 * Test-only better-auth instance, identical to `server.ts` plus the
 * `testUtils` plugin. Kept separate from the production instance per
 * `testUtils`'s own docstring recommendation — mixing it into production
 * config would expose privileged helpers (`ctx.test.createUser`, `.login`,
 * `.deleteUser`, ...) on that instance's context.
 *
 * Only ever imported from the test-only route guarded by
 * `process.env.NODE_ENV !== 'production'` (see
 * `src/app/api/test/accounts/route.ts`) and the Playwright E2E suite.
 */
export const testAuth = betterAuth({
  ...authOptions,
  plugins: [
    jwt(),
    oauthProvider({
      loginPage: '/',
      consentPage: '/oauth/consent',
      scopes: ['openid', 'profile', 'email', 'offline_access', 'read:profile', 'write:profile'],
      allowDynamicClientRegistration: false,
      accessTokenExpiresIn: 15 * 60,
    }),
    passkey({
      rpID: webauthn.rpId,
      rpName: webauthn.rpName,
      origin: webauthn.expectedOrigins,
    }),
    multiSession({ maximumSessions: 5 }),
    testUtils(),
    nextCookies(),
  ],
});
