import { headers } from 'next/headers';
import type { ProviderProfile } from '@karasu-lab/types/shared';
import { vercelProtectionBypassHeaders } from '@karasu-lab/utils/server';

export type { ProviderProfile };

export async function getLinkedProviderProfiles(): Promise<Record<string, ProviderProfile | null> | null> {
  const cookie = (await headers()).get('cookie');
  const base = (process.env.AUTH_URL ?? '').replace(/\/+$/, '');
  const res = await fetch(`${base}/api/users/me/providers`, {
    headers: {
      ...(cookie ? { cookie } : {}),
      ...vercelProtectionBypassHeaders(process.env.VERCEL_PROTECTION_BYPASS_SECRET),
    },
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as Record<string, ProviderProfile | null>;
}
