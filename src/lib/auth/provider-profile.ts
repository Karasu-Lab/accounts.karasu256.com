import { headers } from 'next/headers';
import type { ProviderProfile } from '@karasu-lab/types/shared';
import { buildSignedAuthRequest, sendSignedAuthRequest } from '@/lib/auth/remote';

export type { ProviderProfile };

export async function getProviderProfile(providerId: string): Promise<ProviderProfile | null> {
  const cookie = (await headers()).get('cookie');
  const request = buildSignedAuthRequest(`/api/users/me/providers/${encodeURIComponent(providerId)}/details`, { cookie });
  const res = await sendSignedAuthRequest(request).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as ProviderProfile;
}
