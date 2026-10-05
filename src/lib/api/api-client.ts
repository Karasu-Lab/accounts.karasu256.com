import { UnknownPermissionError, type PermissionSummary } from '@Hashibutogarasu/api-permissions';
import { MissingEnvError, vercelProtectionBypassHeaders } from '@Hashibutogarasu/utils/server';

function apiUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) throw new MissingEnvError('API_URL');
  return `${base}${path}`;
}

/** Permission grants are internal operations, so they carry the shared service secret rather than a user credential. */
function internalHeaders(): Record<string, string> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new MissingEnvError('INTERNAL_API_SECRET');
  return { Authorization: `Bearer ${secret}`, ...vercelProtectionBypassHeaders(process.env.VERCEL_PROTECTION_BYPASS_SECRET) };
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`api.karasu256.com responded ${res.status} for ${res.url}`);
  return (await res.json()) as T;
}

export interface ApiMeta {
  apiUrl: string;
  gitBranch: string;
}

export async function getApiMeta(): Promise<ApiMeta> {
  return readJson(await fetch(apiUrl('/meta'), { cache: 'no-store' }));
}

export async function listActivePermissions(): Promise<PermissionSummary[]> {
  return readJson(await fetch(apiUrl('/permissions'), { cache: 'no-store' }));
}

export async function listOauthScopes(): Promise<string[]> {
  return readJson(await fetch(apiUrl('/permissions/scopes'), { cache: 'no-store' }));
}

export async function grantPermissions(apiKeyId: string, publicIds: string[]): Promise<PermissionSummary[]> {
  const res = await fetch(apiUrl(`/internal/api-keys/${encodeURIComponent(apiKeyId)}/permissions`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...internalHeaders() },
    body: JSON.stringify({ permissions: publicIds }),
    cache: 'no-store',
  });
  if (res.status === 400) throw new UnknownPermissionError();
  return readJson(res);
}

export async function getGrantedPermissions(apiKeyIds: string[]): Promise<Map<string, PermissionSummary[]>> {
  if (apiKeyIds.length === 0) return new Map();
  const res = await fetch(apiUrl(`/internal/api-keys/permissions?ids=${apiKeyIds.map(encodeURIComponent).join(',')}`), {
    headers: internalHeaders(),
    cache: 'no-store',
  });
  return new Map(Object.entries(await readJson<Record<string, PermissionSummary[]>>(res)));
}
