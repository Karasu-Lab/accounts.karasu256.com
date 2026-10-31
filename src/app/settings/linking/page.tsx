import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getLinkedProviderProfile, type ProviderProfile } from '@/lib/auth/linked-provider-profile';
import { getSessionUser } from '@/lib/session-user';
import { ProviderSectionClient } from './provider-section-client';

/** The social providers shown on the linking page (kept in step with the definitions in `provider-section-client`). */
const SOCIAL_PROVIDER_IDS = ['google', 'github'];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('connections.title') };
}

/**
 * The linked state is judged solely by auth.karasu256.com's provider
 * profile API: a provider is linked exactly when a profile comes back
 * for it. No provider IDs are read from this app's own data store.
 */
export default async function LinkingPage() {
  const sessionUser = await getSessionUser();
  const initialProfiles: Record<string, ProviderProfile | null> = {};
  if (sessionUser) {
    const profiles = await Promise.all(SOCIAL_PROVIDER_IDS.map((providerId) => getLinkedProviderProfile(providerId)));
    SOCIAL_PROVIDER_IDS.forEach((providerId, i) => {
      initialProfiles[providerId] = profiles[i];
    });
  }
  return <ProviderSectionClient initialProfiles={initialProfiles} />;
}
