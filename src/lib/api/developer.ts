import {
  DEVICE_CODE_GRANT_TYPE,
  groupScopesBySection,
  oauthClientIsPublic,
  oauthClientType,
  type PermissionSection,
} from '@karasu-lab/types/client';
import {
  decodePermissionBitmask,
  type ApiKeyCreated,
  type ApiKeyDetail,
  type ApiKeySummary,
  type OAuthClientCreated,
  type OAuthClientSummary,
  type OAuthClientType,
  type PermissionSummary,
} from '@karasu-lab/types/shared';
import { ApiError } from '@karasu-lab/utils/client';
import type { AuthClientHandle } from '@/lib/auth/client';

export type { ApiKeyCreated, ApiKeyDetail, ApiKeySummary, OAuthClientCreated, OAuthClientSummary, OAuthClientType, PermissionSection };
export type ApiKeyPermission = PermissionSummary;
export { DEVICE_CODE_GRANT_TYPE, decodePermissionBitmask, groupScopesBySection, oauthClientIsPublic, oauthClientType };

export async function createOAuthClient({ authClient }: AuthClientHandle, input: {
  client_name: string;
  redirect_uris: string[];
  logo_uri?: string;
  scope: string;
  type: OAuthClientType;
  publicClient?: boolean;
}): Promise<OAuthClientCreated> {
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
  { authClient }: AuthClientHandle,
  clientId: string,
  update: Partial<{
    client_name: string;
    redirect_uris: string[];
    logo_uri: string;
    scope: string;
    token_endpoint_auth_method: string;
  }>
): Promise<OAuthClientSummary> {
  const { data, error } = await authClient.oauth2.updateClient({ client_id: clientId, update });
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
  return data as OAuthClientSummary;
}

export async function deleteOAuthClient({ authClient }: AuthClientHandle, clientId: string): Promise<void> {
  const { error } = await authClient.oauth2.deleteClient({ client_id: clientId });
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
}

export async function rotateOAuthClientSecret({ authClient }: AuthClientHandle, clientId: string): Promise<{ client_secret: string }> {
  const { data, error } = await authClient.oauth2.client.rotateSecret({ client_id: clientId });
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
  return data as { client_secret: string };
}
