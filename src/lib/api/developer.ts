import type { ApiKeyCreated, ApiKeySummary, PermissionSummary } from '@karasu-lab/api-permissions';
import { ApiError } from '@karasu-lab/utils/client';
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
