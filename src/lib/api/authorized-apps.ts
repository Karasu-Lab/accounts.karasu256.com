import type { AuthorizedApp } from '@karasu-lab/types/client';
import { ApiError } from '@karasu-lab/utils/client';
import type { AuthClientHandle } from '@/lib/auth/client';

export type { AuthorizedApp };

export interface AuthorizedAppSummary {
  id: string;
  clientId: string;
  clientName?: string;
  createdAt: string;
}

export async function listAuthorizedApps({ config }: AuthClientHandle): Promise<AuthorizedAppSummary[]> {
  const response = await fetch(`${config.authApiUrl.replace(/\/+$/, '')}/api/users/me/authorized-apps`, {
    credentials: 'include',
  });
  if (!response.ok) throw new ApiError(response.status, 'Request failed');
  return (await response.json()) as AuthorizedAppSummary[];
}

export async function getAuthorizedApp({ config }: AuthClientHandle, consentId: string): Promise<AuthorizedApp> {
  const response = await fetch(`${config.authApiUrl.replace(/\/+$/, '')}/api/users/me/authorized-apps/${encodeURIComponent(consentId)}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new ApiError(response.status, 'Request failed');
  return (await response.json()) as AuthorizedApp;
}

export async function revokeAuthorizedApp({ authClient }: AuthClientHandle, consentId: string): Promise<void> {
  const { error } = await authClient.oauth2.deleteConsent({ id: consentId });
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
}
