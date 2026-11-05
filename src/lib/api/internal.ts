import { createHash, createPrivateKey, randomUUID, sign } from 'node:crypto';
import { headers } from 'next/headers';
import { MissingEnvError, vercelProtectionBypassHeaders } from '@karasu-lab/utils/server';

/**
 * Service-to-service calls to api.karasu256.com's internal user
 * endpoints, which own this app's former direct database access and
 * all Firebase access: the linked providers, the Firebase user link
 * and the Firebase profile photo. This app holds no database or
 * Firebase configuration of its own anymore; the API is the single
 * place that reads and writes the database and the only holder of
 * the Firebase service account.
 *
 * Every call carries two proofs, and the API requires both to name
 * the user in the path:
 *
 * - this app's own short-lived token (see signAppToken), proving the
 *   caller is the genuine app, and
 * - the signed-in user's better-auth session token, exchanged from
 *   the request's session cookie at the auth API, proving the user.
 */
function internalUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) throw new MissingEnvError('API_URL');
  return `${base}${path}`;
}

const APP_TOKEN_TTL_SECONDS = 120;

function base64Url(data: string | Buffer): string {
  return Buffer.from(data).toString('base64url');
}

/**
 * Issues this app's own token for one internal call: a compact JWS
 * (EdDSA) signed with the app private key whose public half the API
 * registers against the app ID. The claims bind the call — issuer is
 * the app ID, audience is the API's origin, subject is the user the
 * call acts for, and the method, path and body hash are signed — and
 * the token lives for APP_TOKEN_TTL_SECONDS with a unique ID, so the
 * API can reject any replay of it.
 */
function signAppToken(userId: string, method: string, url: URL, body: string): string {
  const appId = process.env.APP_ID;
  if (!appId) throw new MissingEnvError('APP_ID');
  const keyMaterial = process.env.APP_PRIVATE_KEY;
  if (!keyMaterial) throw new MissingEnvError('APP_PRIVATE_KEY');

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: appId,
      aud: url.origin,
      sub: userId,
      iat: now,
      exp: now + APP_TOKEN_TTL_SECONDS,
      jti: randomUUID(),
      method,
      path: url.pathname,
      bodySha256: createHash('sha256').update(body).digest('hex'),
    })
  );
  const signingInput = `${header}.${payload}`;
  const key = createPrivateKey({ key: Buffer.from(keyMaterial, 'base64'), format: 'der', type: 'pkcs8' });
  const signature = sign(null, Buffer.from(signingInput), key);
  return `${signingInput}.${base64Url(signature)}`;
}

/**
 * Exchanges the current request's better-auth session cookie for the
 * session token the auth API issues at its token endpoint — the same
 * exchange the session SDK performs — so the API can verify the user
 * itself instead of trusting this app's word for who they are.
 */
async function fetchSessionToken(): Promise<string> {
  const authApiUrl = process.env.AUTH_API_URL;
  if (!authApiUrl) throw new MissingEnvError('AUTH_API_URL');
  const requestHeaders = await headers();
  let cookie = requestHeaders.get('cookie');
  if (!cookie) {
    const authorization = requestHeaders.get('authorization');
    if (authorization?.startsWith('Bearer ')) {
      cookie = `better-auth.session_token=${authorization.slice('Bearer '.length)}`;
    }
  }
  if (!cookie) throw new Error('api-auth session token exchange failed: the request has no session cookie');

  const res = await fetch(`${authApiUrl}/api/auth/token`, {
    headers: { cookie, ...vercelProtectionBypassHeaders(process.env.VERCEL_PROTECTION_BYPASS_SECRET) },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api-auth session token exchange failed: ${res.status}`);
  const { token } = (await res.json()) as { token?: string };
  if (!token) throw new Error('api-auth session token exchange failed: no token in the response');
  return token;
}

async function internalFetch(path: string, userId: string, init: RequestInit = {}): Promise<Response> {
  const url = new URL(internalUrl(path));
  const method = init.method ?? 'GET';
  const body = typeof init.body === 'string' ? init.body : '';
  const sessionToken = await fetchSessionToken();
  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${sessionToken}`,
      'x-app-token': signAppToken(userId, method, url, body),
    },
    cache: 'no-store',
  });
}

/** Lists the social-provider IDs linked to the user, as the API reports them. */
export async function fetchLinkedProviderIds(userId: string): Promise<string[]> {
  const res = await internalFetch(`/internal/users/${encodeURIComponent(userId)}/linked-providers`, userId);
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
    userId,
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
  const res = await internalFetch(`/internal/users/${encodeURIComponent(userId)}/firebase-photo`, userId, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ photoURL }),
  });
  if (!res.ok) throw new Error(`api.karasu256.com responded ${res.status} for ${res.url}`);
  return (await res.json()) as FirebasePhotoResult;
}

async function uploadFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const sessionToken = await fetchSessionToken();
  return fetch(internalUrl(path), {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${sessionToken}` },
    cache: 'no-store',
  });
}

export interface UploadVerifyRequest {
  path: string;
  sha256: string;
  contentType: string;
  size: number;
  uploaderId?: string;
}

export interface VerifiedUpload {
  url: string;
  sha256: string;
  contentType: string;
  size: number;
}

export async function fetchVerifyUpload(upload: UploadVerifyRequest): Promise<VerifiedUpload | null> {
  const res = await uploadFetch('/upload/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(upload),
  });
  if (res.status === 422) return null;
  if (!res.ok) throw new Error(`api.karasu256.com responded ${res.status} for ${res.url}`);
  return (await res.json()) as VerifiedUpload;
}

export interface UploadStatus {
  valid: true;
  url: string;
  sha256?: string;
  contentType?: string;
  size?: number;
}

export async function fetchUploadStatus(path: string, uploaderId: string): Promise<UploadStatus | null> {
  const query = new URLSearchParams({ path, uploaderId });
  const res = await uploadFetch(`/upload/verify?${query}`);
  if (res.status === 404 || res.status === 422) return null;
  if (!res.ok) throw new Error(`api.karasu256.com responded ${res.status} for ${res.url}`);
  const status = (await res.json()) as UploadStatus;
  return status.valid ? status : null;
}
