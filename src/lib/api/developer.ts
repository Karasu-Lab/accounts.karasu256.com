import type { ApiKeyCreated, ApiKeySummary, PermissionSummary } from '@karasu-lab/api-permissions';
import { ApiError } from '@karasu-lab/utils/client';
import type { AuthClientHandle } from '@/lib/auth/client';

export type { ApiKeyCreated, ApiKeySummary };
export type ApiKeyPermission = PermissionSummary;

export type OAuthClientType = 'web' | 'device';

export const DEVICE_CODE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

export interface OAuthClientSummary {
  client_id: string;
  client_name?: string;
  logo_uri?: string;
  redirect_uris: string[];
  scope?: string;
  grant_types?: string[];
  token_endpoint_auth_method?: string;
  description?: string | null;
  icon_url?: string | null;
  resource?: string | null;
}

export function oauthClientType(client: Pick<OAuthClientSummary, 'grant_types'>): OAuthClientType {
  const grantTypes = client.grant_types ?? [];
  return grantTypes.includes(DEVICE_CODE_GRANT_TYPE) && !grantTypes.includes('authorization_code') ? 'device' : 'web';
}

export function oauthClientIsPublic(client: Pick<OAuthClientSummary, 'token_endpoint_auth_method'>): boolean {
  return client.token_endpoint_auth_method === 'none';
}

export interface OAuthClientCreated extends OAuthClientSummary {
  client_secret?: string;
}

export async function createOAuthClient({ authClient, bridgeFirebaseSession }: AuthClientHandle, input: {
  client_name: string;
  redirect_uris: string[];
  logo_uri?: string;
  scope: string;
  type: OAuthClientType;
  publicClient?: boolean;
}): Promise<OAuthClientCreated> {
  await bridgeFirebaseSession();
  const { type, redirect_uris, publicClient, ...rest } = input;
  const payload =
    type === 'device'
      ? { ...rest, grant_types: [DEVICE_CODE_GRANT_TYPE], token_endpoint_auth_method: 'none' }
      : { ...rest, redirect_uris, token_endpoint_auth_method: publicClient ? 'none' : 'client_secret_basic' };
  const { data, error } = await authClient.oauth2.createClient(payload);
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
  return data as OAuthClientCreated;
}

export async function updateOAuthClient(
  { authClient, bridgeFirebaseSession }: AuthClientHandle,
  clientId: string,
  update: Partial<{
    client_name: string;
    redirect_uris: string[];
    logo_uri: string;
    scope: string;
    token_endpoint_auth_method: string;
  }>
): Promise<OAuthClientSummary> {
  await bridgeFirebaseSession();
  const { data, error } = await authClient.oauth2.updateClient({ client_id: clientId, update });
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
  return data as OAuthClientSummary;
}

export async function deleteOAuthClient({ authClient, bridgeFirebaseSession }: AuthClientHandle, clientId: string): Promise<void> {
  await bridgeFirebaseSession();
  const { error } = await authClient.oauth2.deleteClient({ client_id: clientId });
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
}

export async function rotateOAuthClientSecret({ authClient, bridgeFirebaseSession }: AuthClientHandle, clientId: string): Promise<{ client_secret: string }> {
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
