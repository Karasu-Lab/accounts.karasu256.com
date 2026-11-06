import type { AuthorizedApp } from '@karasu-lab/types/client';
import { ApiError } from '@karasu-lab/utils/client';
import type { AuthClientHandle } from '@/lib/auth/client';

export type { AuthorizedApp };

interface ConsentRecord {
  id: string;
  clientId: string;
  scopes: string[];
  createdAt: Date;
}

interface PublicClient {
  client_name?: string;
  logo_uri?: string;
}

export async function listAuthorizedApps({ authClient, bridgeFirebaseSession }: AuthClientHandle): Promise<AuthorizedApp[]> {
  await bridgeFirebaseSession();
  const { data, error } = await authClient.oauth2.getConsents();
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
  const consents = (data ?? []) as ConsentRecord[];

  return Promise.all(
    consents.map(async (consent) => {
      const { data: client } = await authClient.oauth2
        .publicClient({ query: { client_id: consent.clientId } })
        .catch(() => ({ data: null }));
      const pub = client as PublicClient | null;
      return {
        id: consent.id,
        clientId: consent.clientId,
        clientName: pub?.client_name,
        logoUri: pub?.logo_uri,
        scopes: consent.scopes ?? [],
        createdAt: new Date(consent.createdAt).toISOString(),
      };
    })
  );
}

export async function revokeAuthorizedApp({ authClient, bridgeFirebaseSession }: AuthClientHandle, consentId: string): Promise<void> {
  await bridgeFirebaseSession();
  const { error } = await authClient.oauth2.deleteConsent({ id: consentId });
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
}
