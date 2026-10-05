import type { ApiKeyCreated, ApiKeySummary, PermissionSummary } from '@Hashibutogarasu/api-permissions';
import { ApiError } from '@Hashibutogarasu/utils/client';
import { authClient, bridgeFirebaseSession } from '@/lib/auth/client';

export type { ApiKeyCreated, ApiKeySummary };
export type ApiKeyPermission = PermissionSummary;

export interface OAuthClientSummary {
  client_id: string;
  client_name?: string;
  logo_uri?: string;
  redirect_uris: string[];
  scope?: string;
}

export interface OAuthClientCreated extends OAuthClientSummary {
  client_secret: string;
}

/**
 * Lists the OAuth clients owned by the current user, via
 * accounts.karasu256.com's better-auth OAuth authorization server.
 */
export async function listOAuthClients(): Promise<OAuthClientSummary[]> {
  await bridgeFirebaseSession();
  const { data, error } = await authClient.oauth2.getClients();
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
  return (data ?? []) as OAuthClientSummary[];
}

export async function createOAuthClient(input: {
  client_name: string;
  redirect_uris: string[];
  logo_uri?: string;
  scope: string;
}): Promise<OAuthClientCreated> {
  await bridgeFirebaseSession();
  const { data, error } = await authClient.oauth2.createClient(input);
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
  return data as OAuthClientCreated;
}

export async function updateOAuthClient(
  clientId: string,
  update: Partial<{
    client_name: string;
    redirect_uris: string[];
    logo_uri: string;
    scope: string;
  }>
): Promise<OAuthClientSummary> {
  await bridgeFirebaseSession();
  const { data, error } = await authClient.oauth2.updateClient({ client_id: clientId, update });
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
  return data as OAuthClientSummary;
}

export async function deleteOAuthClient(clientId: string): Promise<void> {
  await bridgeFirebaseSession();
  const { error } = await authClient.oauth2.deleteClient({ client_id: clientId });
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
}

export async function rotateOAuthClientSecret(clientId: string): Promise<{ client_secret: string }> {
  await bridgeFirebaseSession();
  const { data, error } = await authClient.oauth2.client.rotateSecret({ client_id: clientId });
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
  return data as { client_secret: string };
}

/**
 * Lists the permissions that can be granted to an API key.
 *
 * @throws {ApiError} When the request fails with a non-ok HTTP status.
 */
export async function listGrantablePermissions(): Promise<ApiKeyPermission[]> {
  await bridgeFirebaseSession();
  const res = await fetch('/api/permissions', { credentials: 'include' });
  if (!res.ok) throw ApiError.fromResponse(res);
  return res.json() as Promise<ApiKeyPermission[]>;
}

/**
 * Lists the current user's API keys.
 *
 * @throws {ApiError} When the request fails with a non-ok HTTP status.
 */
export async function listApiKeys(): Promise<ApiKeySummary[]> {
  await bridgeFirebaseSession();
  const res = await fetch('/api/api-keys', { credentials: 'include' });
  if (!res.ok) throw ApiError.fromResponse(res);
  return res.json() as Promise<ApiKeySummary[]>;
}

/**
 * Issues an API key granted the permissions identified by `permissionPublicIds`.
 *
 * @throws {ApiError} When the request fails with a non-ok HTTP status.
 */
export async function createApiKey(name: string, permissionPublicIds: string[]): Promise<ApiKeyCreated> {
  await bridgeFirebaseSession();
  const res = await fetch('/api/api-keys', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, permissions: permissionPublicIds }),
  });
  if (!res.ok) throw ApiError.fromResponse(res);
  return res.json() as Promise<ApiKeyCreated>;
}

/**
 * Deletes one of the current user's API keys.
 *
 * @throws {ApiError} When the request fails with a non-ok HTTP status.
 */
export async function deleteApiKey(id: string): Promise<void> {
  await bridgeFirebaseSession();
  const res = await fetch(`/api/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok && res.status !== 204) throw ApiError.fromResponse(res);
}

/**
 * Returns the catalog of OAuth scopes an OAuth client can request.
 *
 * @throws {ApiError} When the request fails with a non-ok HTTP status.
 */
export async function getAvailableScopes(): Promise<string[]> {
  const res = await fetch('/api/permissions/sections');
  if (!res.ok) throw ApiError.fromResponse(res);
  return res.json() as Promise<string[]>;
}

export interface PermissionSection {
  key: string;
  canRead: boolean;
  canWrite: boolean;
}

/** Groups `"read:<key>"`/`"write:<key>"` scope strings by their section key. */
export function groupScopesBySection(scopes: string[]): PermissionSection[] {
  const byKey = new Map<string, PermissionSection>();
  for (const scope of scopes) {
    const [mode, key] = scope.split(':');
    if (!key || (mode !== 'read' && mode !== 'write')) continue;
    const section = byKey.get(key) ?? { key, canRead: false, canWrite: false };
    if (mode === 'read') section.canRead = true;
    else section.canWrite = true;
    byKey.set(key, section);
  }
  return [...byKey.values()];
}
