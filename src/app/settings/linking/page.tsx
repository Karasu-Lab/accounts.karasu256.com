import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { fetchOAuthProviders } from '@/lib/api/oauth-providers';
import { ProviderSectionClient } from './provider-section-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('connections.title') };
}

export default async function LinkingPage() {
  const providers = await fetchOAuthProviders();
  return <ProviderSectionClient providers={providers} />;
}
