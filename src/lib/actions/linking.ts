'use server';

import { getLinkedProviderProfiles, type ProviderProfile } from '@/lib/auth/linked-provider-profile';

const PROVIDER_IDS = ['google', 'github', 'microsoft', 'xbox', 'minecraft'];

export async function loadLinkedProviderProfiles(): Promise<Record<string, ProviderProfile | null>> {
  const profiles = await getLinkedProviderProfiles();
  if (!profiles) return {};
  const loadedProfiles: Record<string, ProviderProfile | null> = {};
  for (const providerId of PROVIDER_IDS) {
    loadedProfiles[providerId] = profiles[providerId] ?? null;
  }
  return loadedProfiles;
}
