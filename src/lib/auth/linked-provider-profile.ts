import { headers } from 'next/headers';
import { vercelProtectionBypassHeaders } from '@karasu-lab/utils/server';
import type { ProviderProfile } from '@/lib/auth/provider-profile';

export type { ProviderProfile };

/**
 * Fetches the signed-in user's profile for one provider from
 * auth.karasu256.com's provider profile API, forwarding the session
 * cookie.
 *
 * This is the single source of truth for the linked state: the provider
 * counts as linked exactly when a profile comes back. The accounts app
 * never judges the linked state from its own data store.
 *
 * @returns The provider profile, or `null` when the provider is not
 * linked (the API answers 404), there is no valid session, or the
 * request fails.
 */
export async function getLinkedProviderProfile(providerId: string): Promise<ProviderProfile | null> {
  const cookie = (await headers()).get('cookie');
  const base = (process.env.AUTH_URL ?? '').replace(/\/+$/, '');
  const res = await fetch(`${base}/api/users/me/providers/${encodeURIComponent(providerId)}/details`, {
    headers: {
      ...(cookie ? { cookie } : {}),
      ...vercelProtectionBypassHeaders(process.env.VERCEL_PROTECTION_BYPASS_SECRET),
    },
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as ProviderProfile;
}
