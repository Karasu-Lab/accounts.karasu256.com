import { NextResponse } from 'next/server';
import { ALL_PERMISSIONS, toOauthScope } from '@Hashibutogarasu/api-permissions';

/**
 * OAuth scopes an OAuth client may request, derived from the permission
 * registry in `@Hashibutogarasu/api-permissions`. Must stay in sync with the
 * scopes declared in `apps/accounts.karasu256.com/src/lib/auth/server.ts`'s
 * `oauthProvider({ scopes })`.
 */
const AVAILABLE_SCOPES = ALL_PERMISSIONS.map(toOauthScope);

export async function GET() {
  return NextResponse.json(AVAILABLE_SCOPES);
}
