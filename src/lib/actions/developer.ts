'use server';

import { cookies } from 'next/headers';
import { listOauthScopes } from '@/lib/api/api-client';
import type { ApiKeyCreated, ApiKeyPermission, ApiKeySummary, OAuthClientSummary } from '@/lib/api/developer';

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

/** The base URL of the auth API, which owns API key processing. */
function authApiBase(): string {
  const base = process.env.NEXT_PUBLIC_AUTH_API_URL;
  if (!base) throw new Error('NEXT_PUBLIC_AUTH_API_URL is not configured');
  return base.replace(/\/$/, '');
}

/**
 * Lists the signed-in user's API keys from the auth API, which owns
 * the key table and the permission grants. The session cookie rides
 * along on the shared parent domain, so the auth API sees the same
 * session the browser holds.
 *
 * @throws when the auth API does not answer OK, so the caller can
 * show an error state instead of an empty list.
 */
export async function loadApiKeys(): Promise<ApiKeySummary[]> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${authApiBase()}/api/api-keys`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api-auth.karasu256.com responded ${res.status} for api-keys`);
  return (await res.json()) as ApiKeySummary[];
}

/** Lists the permissions that can be granted to an API key, read from the auth API. */
export async function loadGrantablePermissions(): Promise<ApiKeyPermission[]> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${authApiBase()}/api/permissions`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api-auth.karasu256.com responded ${res.status} for permissions`);
  return (await res.json()) as ApiKeyPermission[];
}

/** Issues an API key granted the permissions identified by their public ids. The raw key is only returned here. */
export async function createApiKey(name: string, permissionPublicIds: string[]): Promise<ApiKeyCreated> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${authApiBase()}/api/api-keys`, {
    method: 'POST',
    headers: { cookie: cookieHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, permissions: permissionPublicIds }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api-auth.karasu256.com responded ${res.status} for api-keys`);
  return (await res.json()) as ApiKeyCreated;
}

/** Deletes one of the signed-in user's API keys. */
export async function deleteApiKey(id: string): Promise<void> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${authApiBase()}/api/api-keys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api-auth.karasu256.com responded ${res.status} for api-keys/${id}`);
}
