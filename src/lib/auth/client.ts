import { createAppAuthClient } from '@karasu-lab/utils/client';
import { buildUriWithNext } from '@karasu-lab/utils/uri';

export const { authClient, bridgeFirebaseSession } = createAppAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_API_URL,
});

export function getSignInUrl(next: string): string {
  return buildUriWithNext(new URL('/sign-in', process.env.NEXT_PUBLIC_AUTH_URL).toString(), next);
}
