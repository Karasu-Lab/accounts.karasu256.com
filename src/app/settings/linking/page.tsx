import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ProviderSectionClient } from './provider-section-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('connections.title') };
}

export default function LinkingPage() {
  return <ProviderSectionClient />;
}
