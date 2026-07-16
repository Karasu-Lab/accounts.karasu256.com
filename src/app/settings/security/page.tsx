import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SecurityClient } from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('security.title') };
}

export default function SecurityPage() {
  return <SecurityClient />;
}
