import { ApiError } from '@karasu-lab/utils/client';
import { authClient, bridgeFirebaseSession } from '@/lib/auth/client';

export interface AuthorizedApp {
  /** The consent record's id, used to revoke the authorization. */
  id: string;
  clientId: string;
  clientName?: string;
  logoUri?: string;
  /** The scopes the user approved for this app. */
  scopes: string[];
  /** When the user authorized the app. */
  createdAt: string;
}

interface ConsentRecord {
  id: string;
  clientId: string;
  scopes: string[];
  createdAt: string;
}

interface PublicClient {
  client_name?: string;
  logo_uri?: string;
}

/**
 * Lists the apps the current user has authorized, from the OAuth
 * authorization server's consent records, enriched with each client's
 * public name and logo.
 */
export async function listAuthorizedApps(): Promise<AuthorizedApp[]> {
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
        createdAt: consent.createdAt,
      };
    })
  );
}

/** Revokes one authorized app by deleting its consent record. */
export async function revokeAuthorizedApp(consentId: string): Promise<void> {
  await bridgeFirebaseSession();
  const { error } = await authClient.oauth2.deleteConsent({ id: consentId });
  if (error) throw new ApiError(error.status, error.message ?? 'Request failed');
}
