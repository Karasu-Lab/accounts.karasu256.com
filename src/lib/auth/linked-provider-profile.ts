import { headers } from 'next/headers';
import type { ProviderProfile } from '@karasu-lab/types/shared';
import { vercelProtectionBypassHeaders } from '@karasu-lab/utils/server';

export type { ProviderProfile };

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
