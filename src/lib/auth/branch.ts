import { headers } from 'next/headers';
import { buildSignedAuthRequest, sendSignedAuthRequest } from '@/lib/auth/remote';

/** Returns the database branch auth.karasu256.com serves this app from, or `null` in production or when auth is unreachable. */
export async function getAuthBranch(): Promise<string | null> {
  const cookie = (await headers()).get('cookie');
  const res = await sendSignedAuthRequest(buildSignedAuthRequest('/api/dev/branch', { cookie })).catch(() => null);
  if (!res?.ok) return null;
  const { branch } = (await res.json()) as { branch: string | null };
  return branch;
}
