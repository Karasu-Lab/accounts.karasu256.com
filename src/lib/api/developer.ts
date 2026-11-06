import {
  DEVICE_CODE_GRANT_TYPE,
  groupScopesBySection,
  oauthClientIsPublic,
  oauthClientType,
  type PermissionSection,
} from '@karasu-lab/types/client';
import type {
  ApiKeyCreated,
  ApiKeySummary,
  OAuthClientCreated,
  OAuthClientSummary,
  OAuthClientType,
  PermissionSummary,
} from '@karasu-lab/types/shared';
import { ApiError } from '@karasu-lab/utils/client';
import type { AuthClientHandle } from '@/lib/auth/client';

export type { ApiKeyCreated, ApiKeySummary, OAuthClientCreated, OAuthClientSummary, OAuthClientType, PermissionSection };
export type ApiKeyPermission = PermissionSummary;
export { DEVICE_CODE_GRANT_TYPE, groupScopesBySection, oauthClientIsPublic, oauthClientType };

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
