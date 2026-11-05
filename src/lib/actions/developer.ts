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
interface OAuthClientInfoRow {
  client_id: string;
  name: string;
  author_id: string | null;
  icon_url: string | null;
  description: string | null;
}

export async function loadOAuthClients(): Promise<OAuthClientsData> {
  const cookieHeader = (await cookies()).toString();
  const authApiBase = (process.env.AUTH_API_URL ?? '').replace(/\/$/, '');

  const [clientsRes, infoRes, scopes] = await Promise.all([
    fetch(`${authApiBase}/api/auth/oauth2/get-clients`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    }),
    fetch(`${authApiBase}/api/oauth-client-info`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    }).catch(() => null),
    listOauthScopes(),
  ]);

  if (!clientsRes.ok) {
    throw new Error(`Failed to load OAuth clients: HTTP ${clientsRes.status}`);
  }

  const clients = (await clientsRes.json()) as OAuthClientSummary[];

  // The info rows are the display source for each item's name, icon, and
  // description. A missing info endpoint or row leaves the client's own
  // fields in place, so the list still renders before any info is saved.
  const infoByClientId = new Map<string, OAuthClientInfoRow>();
  if (infoRes?.ok) {
    const rows = (await infoRes.json()) as OAuthClientInfoRow[];
    for (const row of rows) infoByClientId.set(row.client_id, row);
  }

  return {
    clients: clients.map((client) => {
      const info = infoByClientId.get(client.client_id);
      if (!info) return client;
      return { ...client, client_name: info.name, icon_url: info.icon_url, description: info.description };
    }),
    scopes,
  };
}

/**
 * Saves the display info (name, icon, description) for one of the
 * signed-in user's OAuth clients into its `oauth_client_info` row on
 * the auth API, which owns the table. Called right after the client is
 * created or updated so the row mirrors what the settings show.
 */
export async function saveOAuthClientInfo(
  clientId: string,
  info: { name: string; iconUrl: string | null; description: string | null }
): Promise<void> {
  const cookieHeader = (await cookies()).toString();
  const base = authApiBase();

  const res = await fetch(`${base}/api/oauth-client-info/${encodeURIComponent(clientId)}`, {
    method: 'PUT',
    headers: { cookie: cookieHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: info.name, icon_url: info.iconUrl, description: info.description }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to save OAuth client info: HTTP ${res.status}`);
  }
}

/** The base URL of the auth API, which owns API key processing. */
function authApiBase(): string {
  const base = process.env.AUTH_API_URL;
  if (!base) throw new Error('AUTH_API_URL is not configured');
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
