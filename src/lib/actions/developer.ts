'use server';

import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import type { OAuthClientInfo } from '@karasu-lab/types/shared';
import { listOauthScopes } from '@/lib/api/api-client';
import { AuthApiError } from '@/lib/api/auth-api-error';
import type { ApiKeyCreated, ApiKeyPermission, ApiKeySummary, OAuthClientSummary } from '@/lib/api/developer';

export interface OAuthClientsData {
  clients: OAuthClientSummary[];
  scopes: string[];
  baseScopes: string[];
}

export async function loadOAuthClients(): Promise<OAuthClientsData> {
  const cookieHeader = (await cookies()).toString();
  const authApiBase = (process.env.AUTH_API_URL ?? '').replace(/\/$/, '');

  const [clientsRes, infoRes, scopes, discoveryRes] = await Promise.all([
    fetch(`${authApiBase}/api/auth/oauth2/get-clients`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    }),
    fetch(`${authApiBase}/api/oauth-client-info`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    }).catch(() => null),
    listOauthScopes(),
    fetch(`${authApiBase}/api/auth/.well-known/openid-configuration`, { cache: 'no-store' }).catch(() => null),
  ]);

  if (!clientsRes.ok) {
    throw new Error(`Failed to load OAuth clients: HTTP ${clientsRes.status}`);
  }

  const clients = (await clientsRes.json()) as OAuthClientSummary[];

  const infoByClientId = new Map<string, OAuthClientInfo>();
  if (infoRes?.ok) {
    const rows = (await infoRes.json()) as OAuthClientInfo[];
    for (const row of rows) infoByClientId.set(row.client_id, row);
  }

  let supportedScopes: string[] = [];
  if (discoveryRes?.ok) {
    const discovery = (await discoveryRes.json()) as { scopes_supported?: string[] };
    supportedScopes = discovery.scopes_supported ?? [];
  }

  return {
    clients: clients.map((client) => {
      const info = infoByClientId.get(client.client_id);
      if (!info) return client;
      return { ...client, client_name: info.name, icon_url: info.icon_url, description: info.description, resource: info.resource, public: info.public };
    }),
    scopes,
    baseScopes: supportedScopes.filter((scope) => !scopes.includes(scope)),
  };
}

export async function saveOAuthClientInfo(
  clientId: string,
  info: { name: string; iconUrl: string | null; description: string | null; resource: string | null; public: boolean }
): Promise<{ client_secret?: string }> {
  const cookieHeader = (await cookies()).toString();
  const base = authApiBase();

  const res = await fetch(`${base}/api/oauth-client-info/${encodeURIComponent(clientId)}`, {
    method: 'PUT',
    headers: { cookie: cookieHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: info.name, icon_url: info.iconUrl, description: info.description, resource: info.resource, public: info.public }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to save OAuth client info: HTTP ${res.status}`);
  }
  return (await res.json().catch(() => ({}))) as { client_secret?: string };
}

export async function prepareOAuthClientIcon(clientId: string, form: FormData): Promise<{ uploadUrl: string; intent: string }> {
  const file = form.get('file');
  if (!(file instanceof File)) throw new AuthApiError();
  const bytes = Buffer.from(await file.arrayBuffer());

  const res = await fetch(`${authApiBase()}/api/oauth-client-info/${encodeURIComponent(clientId)}/icon`, {
    method: 'POST',
    headers: { cookie: (await cookies()).toString(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content_type: file.type,
      size: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new AuthApiError();
  const { upload_url, intent } = (await res.json()) as { upload_url: string; intent: string };
  return { uploadUrl: upload_url, intent };
}

export async function completeOAuthClientIcon(clientId: string, intent: string): Promise<string> {
  const res = await fetch(`${authApiBase()}/api/oauth-client-info/${encodeURIComponent(clientId)}/icon/complete`, {
    method: 'POST',
    headers: { cookie: (await cookies()).toString(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent }),
    cache: 'no-store',
  });
  if (!res.ok) throw new AuthApiError();
  const { icon_url } = (await res.json()) as { icon_url: string };
  return icon_url;
}

function authApiBase(): string {
  const base = process.env.AUTH_API_URL;
  if (!base) throw new Error('AUTH_API_URL is not configured');
  return base.replace(/\/$/, '');
}

export async function loadApiKeys(): Promise<ApiKeySummary[]> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${authApiBase()}/api/api-keys`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api-auth.karasu256.com responded ${res.status} for api-keys`);
  return (await res.json()) as ApiKeySummary[];
}

export async function loadGrantablePermissions(): Promise<ApiKeyPermission[]> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${authApiBase()}/api/permissions`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api-auth.karasu256.com responded ${res.status} for permissions`);
  return (await res.json()) as ApiKeyPermission[];
}

export async function createApiKey(name: string, permissionPublicIds: string[]): Promise<ApiKeyCreated> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${authApiBase()}/api/api-keys`, {
    method: 'POST',
    headers: { cookie: cookieHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, permissions: permissionPublicIds }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api-auth.karasu256.com responded ${res.status} for api-keys`);
  return (await res.json()) as ApiKeyCreated;
}

export async function deleteApiKey(id: string): Promise<void> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${authApiBase()}/api/api-keys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api-auth.karasu256.com responded ${res.status} for api-keys/${id}`);
}
