import { NextResponse, type NextRequest } from 'next/server';
import { getServerConfig } from '@/lib/config';

/**
 * better-auth only uses `trustedOrigins` for its own cookie/CSRF origin
 * checks — it never emits `Access-Control-*` response headers, so
 * cross-origin calls from karasu256.com and qr.karasu256.com (e.g. the
 * Firebase session bridge, `/oauth2/*` client management, and each app's
 * `authClient.useSession()` call for shared login state) are blocked by the
 * browser without this. Reuses the same `trustedOrigins` list read from
 * `config/*.yml` (see `lib/config/index.ts`) so the two allowlists can't
 * drift apart.
 */
function corsHeaders(origin: string | null): HeadersInit {
  if (!origin || !getServerConfig().trustedOrigins.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
}

/** Answers a CORS preflight request for the given origin. */
export function handlePreflight(request: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) });
}

/** Wraps a route handler, adding CORS headers to its response for trusted cross-origin callers. */
export function withCors<TArgs extends unknown[]>(handler: (request: NextRequest, ...args: TArgs) => Promise<Response>) {
  return async (request: NextRequest, ...args: TArgs) => {
    const response = await handler(request, ...args);
    const headers = corsHeaders(request.headers.get('origin'));
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
    return response;
  };
}
