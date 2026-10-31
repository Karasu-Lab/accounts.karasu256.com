'use server';

import { cookies } from 'next/headers';
import { listOauthScopes } from '@/lib/api/api-client';
import type { OAuthClientSummary } from '@/lib/api/developer';

export interface OAuthClientsData {
  clients: OAuthClientSummary[];
  /** The catalog of scopes an OAuth client can request, ungrouped. */
  scopes: string[];
}

/**
 * Server action backing the developer settings' OAuth client list.
 *
 * The list used to be fetched in the browser: bridging the Firebase
 * session first, then calling the authorization server, all coupled
 * with the API key list behind one shared loading flag — any slow or
 * failed leg left the whole section unstable, and a failure rendered
 * exactly like an empty list. Here the read runs on the server
 * instead: the incoming request's cookies (the better-auth session
 * cookie is scoped to the shared parent domain) are forwarded to the
 * authorization server's get-clients endpoint, and the scope catalog
 * is read from the same source as the permissions sections route.
 * Throws on failure so the caller can show an error state that is
 * distinct from both "loading" and "no clients".
 */
export async function loadOAuthClients(): Promise<OAuthClientsData> {
  const cookieHeader = (await cookies()).toString();
  const authApiBase = (process.env.NEXT_PUBLIC_AUTH_API_URL ?? '').replace(/\/$/, '');

  const [clientsRes, scopes] = await Promise.all([
    fetch(`${authApiBase}/api/auth/oauth2/get-clients`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    }),
    listOauthScopes(),
  ]);

  if (!clientsRes.ok) {
    throw new Error(`Failed to load OAuth clients: HTTP ${clientsRes.status}`);
  }

  const clients = (await clientsRes.json()) as OAuthClientSummary[];
  return { clients, scopes };
}
