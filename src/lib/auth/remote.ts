import { vercelProtectionBypassHeaders } from '@Hashibutogarasu/utils/server';

export function authUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_AUTH_URL ?? ''}${path}`;
}

export function authFetch(path: string, request: Request, init: RequestInit = {}): Promise<Response> {
  return fetch(authUrl(path), {
    ...init,
    headers: {
      ...init.headers,
      cookie: request.headers.get('cookie') ?? '',
      origin: new URL(request.url).origin,
      ...vercelProtectionBypassHeaders(process.env.VERCEL_PROTECTION_BYPASS_SECRET),
    },
    cache: 'no-store',
  });
}
