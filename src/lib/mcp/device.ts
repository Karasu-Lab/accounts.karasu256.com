import { MissingEnvError } from '@karasu-lab/utils/server';

export interface DeviceAuthorization {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string | null;
  expiresIn: number;
  interval: number;
}

export type DeviceTokenResult =
  | { status: 'authorized'; accessToken: string; tokenType: string; expiresIn: number; scope: string; sessionCookie: string | null }
  | { status: 'pending'; error: string; errorDescription: string };

function authApiUrl(): string {
  const base = process.env.AUTH_API_URL;
  if (!base) throw new MissingEnvError('AUTH_API_URL');
  return base;
}

function oauthClientId(): string {
  const clientId = process.env.MCP_OAUTH_CLIENT_ID;
  if (!clientId) throw new MissingEnvError('MCP_OAUTH_CLIENT_ID');
  return clientId;
}

export async function startDeviceAuthorization(): Promise<DeviceAuthorization> {
  const res = await fetch(`${authApiUrl()}/api/auth/device/code`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: oauthClientId() }),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    throw new Error(`Device authorization request failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return {
    deviceCode: String(data?.device_code ?? ''),
    userCode: String(data?.user_code ?? ''),
    verificationUri: String(data?.verification_uri ?? ''),
    verificationUriComplete: typeof data?.verification_uri_complete === 'string' ? data.verification_uri_complete : null,
    expiresIn: Number(data?.expires_in ?? 0),
    interval: Number(data?.interval ?? 5),
  };
}

export async function pollDeviceToken(deviceCode: string): Promise<DeviceTokenResult> {
  const res = await fetch(`${authApiUrl()}/api/auth/device/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceCode,
      client_id: oauthClientId(),
    }),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const error = typeof data?.error === 'string' ? data.error : `http_${res.status}`;
    const errorDescription = typeof data?.error_description === 'string' ? data.error_description : JSON.stringify(data);
    if (error === 'authorization_pending' || error === 'slow_down') {
      return { status: 'pending', error, errorDescription };
    }
    throw new Error(`Device token request failed: ${error}: ${errorDescription}`);
  }

  let sessionCookie: string | null = null;
  for (const cookie of res.headers.getSetCookie()) {
    const pair = cookie.split(';')[0];
    if (pair.startsWith('better-auth.session_token=') || pair.startsWith('__Secure-better-auth.session_token=')) {
      sessionCookie = pair;
      break;
    }
  }

  return {
    status: 'authorized',
    accessToken: String(data?.access_token ?? ''),
    tokenType: String(data?.token_type ?? 'Bearer'),
    expiresIn: Number(data?.expires_in ?? 0),
    scope: String(data?.scope ?? ''),
    sessionCookie,
  };
}
