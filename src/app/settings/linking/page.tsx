import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getLinkedProviderIds } from '@Hashibutogarasu/db';
import { getSessionUser } from '@/lib/session-user';
import { ProviderSectionClient } from './provider-section-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('connections.title') };
}

export default async function LinkingPage() {
  const sessionUser = await getSessionUser();
  const initialProviders = sessionUser ? await getLinkedProviderIds(sessionUser.id) : [];
  return <ProviderSectionClient initialProviders={initialProviders} />;
}
