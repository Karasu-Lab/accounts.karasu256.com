import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getLinkedProviderProfile, type ProviderProfile } from '@/lib/auth/linked-provider-profile';
import { isMinecraftAuthEnabled } from '@/lib/flags';
import { getSessionUser } from '@/lib/session-user';
import { ProviderSectionClient } from './provider-section-client';

const PROVIDER_IDS = ['google', 'github', 'microsoft', 'xbox', 'minecraft'];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('connections.title') };
}

/**
 * The linked state is judged solely by auth.karasu256.com's provider
 * profile API: a provider is linked exactly when a profile comes back
 * for it. No provider IDs are read from this app's own data store.
 *
 * While the `useMinecraftAuth` flag is off, the Minecraft profile is
 * not resolved at all: the provider starts unlinked here and its row
 * stays disabled on the client, so a Minecraft authentication that is
 * turned off never reaches the auth API.
 */
export default async function LinkingPage() {
  const sessionUser = await getSessionUser();
  const initialProfiles: Record<string, ProviderProfile | null> = {};
  if (sessionUser) {
    const minecraftAuthEnabled = await isMinecraftAuthEnabled();
    const providerIds = minecraftAuthEnabled ? PROVIDER_IDS : PROVIDER_IDS.filter((providerId) => providerId !== 'minecraft');
    const profiles = await Promise.all(providerIds.map((providerId) => getLinkedProviderProfile(providerId)));
    providerIds.forEach((providerId, i) => {
      initialProfiles[providerId] = profiles[i];
    });
    if (!minecraftAuthEnabled) initialProfiles['minecraft'] = null;
  }
  return <ProviderSectionClient initialProfiles={initialProfiles} />;
}
