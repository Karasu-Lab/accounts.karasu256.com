import { NextResponse } from 'next/server';
import { listOauthScopes } from '@/lib/api/api-client';

/**
 * OAuth scopes an OAuth client may request. api.karasu256.com derives them from
 * the permission registry; they must stay in sync with the scopes declared in
 * `apps/accounts.karasu256.com/src/lib/auth/server.ts`'s `oauthProvider({ scopes })`.
 */
export async function GET() {
  return NextResponse.json(await listOauthScopes());
}
