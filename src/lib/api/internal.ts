import { createHash, createPrivateKey, sign } from 'node:crypto';
import { MissingEnvError } from '@karasu-lab/utils/server';

/**
 * Service-to-service calls to api.karasu256.com's internal endpoints,
 * which own this app's former direct database access and all Firebase
 * access: the linked providers, the Firebase user link and the
 * Firebase profile photo. This app holds no database or Firebase
 * configuration of its own anymore.
 *
 * Each call is signed with this app's private key — a compact JWS
 * (EdDSA) binding the method, the path, a hash of the body and a
 * timestamp, sent in the `x-app-signature` header. Together with the
 * app ID it is the only proof that the caller is the genuine app: the
 * API registers the matching public key and rejects anything else.
 */
function internalUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) throw new MissingEnvError('API_URL');
  return `${base}${path}`;
}

function base64Url(data: string | Buffer): string {
  return Buffer.from(data).toString('base64url');
}

/** Builds the application signature for one internal call. */
function signAppRequest(method: string, path: string, body: string): string {
  const appId = process.env.APP_ID;
  if (!appId) throw new MissingEnvError('APP_ID');
  const keyMaterial = process.env.APP_PRIVATE_KEY;
  if (!keyMaterial) throw new MissingEnvError('APP_PRIVATE_KEY');

  const header = base64Url(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: appId,
      iat: Math.floor(Date.now() / 1000),
      method,
      path,
      bodySha256: createHash('sha256').update(body).digest('hex'),
    })
  );
  const signingInput = `${header}.${payload}`;
  const key = createPrivateKey({ key: Buffer.from(keyMaterial, 'base64'), format: 'der', type: 'pkcs8' });
  const signature = sign(null, Buffer.from(signingInput), key);
  return `${signingInput}.${base64Url(signature)}`;
}

async function internalFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = init.method ?? 'GET';
  const body = typeof init.body === 'string' ? init.body : '';
  const pathname = new URL(internalUrl(path)).pathname;
  return fetch(internalUrl(path), {
    ...init,
    headers: { ...init.headers, 'x-app-signature': signAppRequest(method, pathname, body) },
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
