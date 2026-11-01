import { MissingEnvError } from '@karasu-lab/utils/server';

/**
 * Service-to-service calls to api.karasu256.com's internal endpoints,
 * which own this app's former direct database access and all Firebase
 * access: the linked providers, the Firebase user link and the
 * Firebase profile photo. This app holds no database or Firebase
 * configuration of its own anymore; the API is the single place that
 * reads and writes the database and the only holder of the Firebase
 * service account, whose private key and the Firebase app ID are the
 * trust anchors for Firebase. Calls carry the shared internal secret,
 * and the user named in each path is the one this app has already
 * authenticated through its session.
 */
function internalUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) throw new MissingEnvError('API_URL');
  return `${base}${path}`;
}

async function internalFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new MissingEnvError('INTERNAL_API_SECRET');
  return fetch(internalUrl(path), {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${secret}` },
    cache: 'no-store',
  });
}

/** Lists the social-provider IDs linked to the user, as the API reports them. */
export async function fetchLinkedProviderIds(userId: string): Promise<string[]> {
  const res = await internalFetch(`/internal/users/${encodeURIComponent(userId)}/linked-providers`);
  if (!res.ok) throw new Error(`api.karasu256.com responded ${res.status} for ${res.url}`);
  const { providerIds } = (await res.json()) as { providerIds: string[] };
  return providerIds;
}

/**
 * Unlinks one provider from the user through the API.
 *
 * @returns `true` when a link was removed, `false` when the user had no such link.
 */
export async function fetchUnlinkProvider(userId: string, providerId: string): Promise<boolean> {
  const res = await internalFetch(
    `/internal/users/${encodeURIComponent(userId)}/linked-providers/${encodeURIComponent(providerId)}`,
    { method: 'DELETE' }
  );
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`api.karasu256.com responded ${res.status} for ${res.url}`);
  return true;
}

export interface FirebasePhotoResult {
  /** Whether the user has a linked Firebase user whose photo was updated. */
  linked: boolean;
  /** The photo URL the Firebase user had before this update, for cleaning up the replaced image. */
  previousPhotoURL: string | null;
}

/**
 * Sets the user's Firebase profile photo through the API, which alone
 * holds the Firebase credentials. Passing null clears the photo.
 */
export async function fetchSetFirebasePhoto(userId: string, photoURL: string | null): Promise<FirebasePhotoResult> {
  const res = await internalFetch(`/internal/users/${encodeURIComponent(userId)}/firebase-photo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ photoURL }),
  });
  if (!res.ok) throw new Error(`api.karasu256.com responded ${res.status} for ${res.url}`);
  return (await res.json()) as FirebasePhotoResult;
}
