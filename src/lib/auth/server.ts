import { betterAuth } from 'better-auth';
import { passkey } from '@better-auth/passkey';
import { oauthProvider } from '@better-auth/oauth-provider';
import { jwt } from 'better-auth/plugins/jwt';
import { multiSession } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { authOptions } from '@/lib/auth/auth-options';
import { getServerConfig } from '@/lib/config';

const { webauthn } = getServerConfig();

/**
 * The single better-auth instance for the monorepo, hosted on
 * accounts.karasu256.com. Firebase Auth remains a backing ID/profile store
 * (see `hooks.ts`), but better-auth is now the sole session authority.
 */
export const auth = betterAuth({
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
    nextCookies(),
  ],
});
