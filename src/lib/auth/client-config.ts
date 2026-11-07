import { z } from 'zod';
import { buildUriWithNext } from '@karasu-lab/utils/uri';

const PRODUCTION_DEFAULTS = {
  authApiUrl: 'https://api-auth.karasu256.com',
  authUrl: 'https://auth.karasu256.com',
  rootAppUrl: 'https://karasu256.com',
  cdnUrl: 'https://cdn.karasu256.com',
  featureFlagsApiUrl: 'https://flags.karasu256.com',
  featureFlagsOrigin: 'https://accounts.karasu256.com',
};

const PREVIEW_DEFAULTS = {
  authApiUrl: 'https://dev-api-auth.karasu256.com',
  authUrl: 'https://dev-auth.karasu256.com',
  rootAppUrl: 'https://dev.karasu256.com',
  cdnUrl: 'https://dev.cdn.karasu256.com',
  featureFlagsApiUrl: 'https://dev-flags.karasu256.com',
  featureFlagsOrigin: 'https://dev.accounts.karasu256.com',
};

const LOCAL_DEFAULTS = {
  authApiUrl: 'http://localhost:8790',
  authUrl: 'http://localhost:3004',
  rootAppUrl: 'http://localhost:3000',
  cdnUrl: 'http://localhost:8788',
  featureFlagsApiUrl: 'http://localhost:8791',
  featureFlagsOrigin: 'http://localhost:3001',
};

type ClientConfigDefaults = typeof PRODUCTION_DEFAULTS;

function clientConfigSchema(defaults: ClientConfigDefaults) {
  return z.object({
    authApiUrl: z.string().url().default(defaults.authApiUrl),
    authUrl: z.string().url().default(defaults.authUrl),
    rootAppUrl: z.string().url().default(defaults.rootAppUrl),
    cdnUrl: z.string().url().default(defaults.cdnUrl),
    featureFlagsApiUrl: z.string().url().default(defaults.featureFlagsApiUrl),
    featureFlagsOrigin: z.string().url().default(defaults.featureFlagsOrigin),
  });
}

export type ClientConfig = z.infer<ReturnType<typeof clientConfigSchema>>;

function defaultsForEnvironment(): ClientConfigDefaults {
  if (process.env.APP_ENV === 'preview') return PREVIEW_DEFAULTS;
  if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') return PRODUCTION_DEFAULTS;
  return LOCAL_DEFAULTS;
}

export function getClientConfig(): ClientConfig {
  return clientConfigSchema(defaultsForEnvironment()).parse({
    authApiUrl: process.env.AUTH_API_URL,
    authUrl: process.env.AUTH_URL,
    rootAppUrl: process.env.ROOT_APP_URL,
    cdnUrl: process.env.CDN_URL,
    featureFlagsApiUrl: process.env.FEATURE_FLAGS_API_URL,
    featureFlagsOrigin: process.env.FEATURE_FLAGS_ORIGIN,
  });
}

/** Builds the auth app's sign-in URL carrying `next` as the post-sign-in destination. */
export function buildSignInUrl(authUrl: string, next: string): string {
  return buildUriWithNext(new URL('/sign-in', authUrl).toString(), next);
}
