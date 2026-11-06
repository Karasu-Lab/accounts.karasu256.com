import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ActiveSessionsClient } from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('activeSessions.title') };
}

export default function ActiveSessionsPage() {
  return <ActiveSessionsClient />;
}
