import { z } from 'zod';
import { buildUriWithNext } from '@karasu-lab/utils/uri';

/**
 * The configuration the client needs, with its single source of truth
 * in the server's environment: the server reads it here and hands it
 * to the client at request time through the auth client provider.
 * Nothing is duplicated into public, build-time variables.
 */
const clientConfigSchema = z.object({
  authApiUrl: z.string().url(),
  authUrl: z.string().url(),
});

export type ClientConfig = z.infer<typeof clientConfigSchema>;

/**
 * Reads the client configuration from the server environment.
 *
 * @throws {z.ZodError} when a required value is missing or not a URL.
 */
export function getClientConfig(): ClientConfig {
  return clientConfigSchema.parse({
    authApiUrl: process.env.AUTH_API_URL,
    authUrl: process.env.AUTH_URL,
  });
}

/** Builds the auth app's sign-in URL carrying `next` as the post-sign-in destination. */
export function buildSignInUrl(authUrl: string, next: string): string {
  return buildUriWithNext(new URL('/sign-in', authUrl).toString(), next);
}
