import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { getDb } from '@Hashibutogarasu/db/client';
import * as schema from '@Hashibutogarasu/db/schema';
import { sendPasswordResetEmail } from '@Hashibutogarasu/utils/email';
import { getServerConfig } from '@/lib/config';
import { deleteFirebaseUser, provisionFirebaseUser, syncNewUserToNeonAuth, syncProfileToFirebase } from '@/lib/auth/hooks';

/**
 * Shared better-auth configuration (everything except `plugins`), used by
 * both the production instance (`server.ts`) and the test-only instance
 * (`server.test.ts`, which additionally includes the `testUtils` plugin).
 * Keeping this in one place prevents the two instances from drifting apart.
 */
export const authOptions = {
  database: drizzleAdapter(getDb(), {
    provider: 'pg' as const,
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      jwks: schema.jwks,
      oauthClient: schema.oauthClients,
      oauthRefreshToken: schema.oauthRefreshTokens,
      oauthAccessToken: schema.oauthAccessTokens,
      oauthConsent: schema.oauthConsents,
      passkey: schema.passkeys,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: getServerConfig().trustedOrigins,
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github'],
      allowDifferentEmails: true,
      updateUserInfoOnLink: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      const { resend } = getServerConfig();
      await sendPasswordResetEmail({ apiKey: resend.apiKey, from: resend.fromEmail, to: user.email, resetUrl: url });
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env.BASE_DOMAIN,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: provisionFirebaseUser,
        after: syncNewUserToNeonAuth,
      },
      update: {
        after: syncProfileToFirebase,
      },
    },
  },
  user: {
    deleteUser: {
      enabled: true,
      afterDelete: deleteFirebaseUser,
    },
  },
  onAPIError: {
    errorURL: '/oauth/error',
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      disableImplicitSignUp: false,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      disableImplicitSignUp: false,
    },
  },
  disabledPaths: ['/token'],
};
