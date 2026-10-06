import { headers } from 'next/headers';
import { vercelProtectionBypassHeaders } from '@Hashibutogarasu/utils/server';
import { authUrl } from '@/lib/auth/remote';

export interface ProviderProfile {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

/**
 * Fetches the current user's profile for a linked provider from
 * auth.karasu256.com, which alone can decrypt the stored provider tokens.
 *
 * @returns `null` when the provider isn't linked or its profile can't be resolved.
 */
export async function getProviderProfile(providerId: string): Promise<ProviderProfile | null> {
  const cookie = (await headers()).get('cookie') ?? '';
  const res = await fetch(authUrl(`/api/users/me/providers/${encodeURIComponent(providerId)}/details`), {
    headers: { cookie, ...vercelProtectionBypassHeaders(process.env.VERCEL_PROTECTION_BYPASS_SECRET) },
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as ProviderProfile;
}
