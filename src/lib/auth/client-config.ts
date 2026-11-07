import { z } from 'zod';
import { buildUriWithNext } from '@karasu-lab/utils/uri';

const clientConfigEnvSchema = z.object({
  AUTH_API_URL: z.url(),
  AUTH_URL: z.url(),
  ROOT_APP_URL: z.url(),
  CDN_URL: z.url(),
  FEATURE_FLAGS_API_URL: z.url(),
  FEATURE_FLAGS_ORIGIN: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  MICROSOFT_CLIENT_ID: z.string().min(1).optional(),
});

export interface ClientConfig {
  authApiUrl: string;
  authUrl: string;
  rootAppUrl: string;
  cdnUrl: string;
  featureFlagsApiUrl: string;
  featureFlagsOrigin: string;
  googleClientId?: string;
  githubClientId?: string;
  microsoftClientId?: string;
}

export function getClientConfig(): ClientConfig {
  const env = clientConfigEnvSchema.parse(process.env);
  return {
    authApiUrl: env.AUTH_API_URL,
    authUrl: env.AUTH_URL,
    rootAppUrl: env.ROOT_APP_URL,
    cdnUrl: env.CDN_URL,
    featureFlagsApiUrl: env.FEATURE_FLAGS_API_URL,
    featureFlagsOrigin: env.FEATURE_FLAGS_ORIGIN,
    googleClientId: env.GOOGLE_CLIENT_ID,
    githubClientId: env.GITHUB_CLIENT_ID,
    microsoftClientId: env.MICROSOFT_CLIENT_ID,
  };
}

export function buildSignInUrl(authUrl: string, next: string): string {
  return buildUriWithNext(new URL('/sign-in', authUrl).toString(), next);
}
