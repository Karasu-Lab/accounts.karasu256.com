'use server';

import { getLinkedProviderProfile, type ProviderProfile } from '@/lib/auth/linked-provider-profile';
import { isMinecraftAuthEnabled } from '@/lib/flags';
import { getSessionUser } from '@/lib/session-user';

const PROVIDER_IDS = ['google', 'github', 'microsoft', 'xbox', 'minecraft'];

export async function loadLinkedProviderProfiles(): Promise<Record<string, ProviderProfile | null>> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return {};
  const minecraftAuthEnabled = await isMinecraftAuthEnabled();
  const providerIds = minecraftAuthEnabled ? PROVIDER_IDS : PROVIDER_IDS.filter((providerId) => providerId !== 'minecraft');
  const profiles = await Promise.all(providerIds.map((providerId) => getLinkedProviderProfile(providerId)));
  const loadedProfiles: Record<string, ProviderProfile | null> = {};
  providerIds.forEach((providerId, i) => {
    loadedProfiles[providerId] = profiles[i];
  });
  if (!minecraftAuthEnabled) loadedProfiles['minecraft'] = null;
  return loadedProfiles;
}
