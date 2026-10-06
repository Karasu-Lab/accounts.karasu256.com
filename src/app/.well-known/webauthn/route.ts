import { NextResponse } from 'next/server';
import { getServerConfig } from '@/lib/config';

/**
 * WebAuthn Related Origin Requests manifest, letting auth.karasu256.com use
 * passkeys registered under this host's RP ID.
 *
 * GET /.well-known/webauthn
 */
export function GET() {
  return NextResponse.json({ origins: getServerConfig().webauthn.expectedOrigins });
}
