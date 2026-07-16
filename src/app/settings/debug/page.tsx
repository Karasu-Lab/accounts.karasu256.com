import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DebugClient } from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('debug.title') };
}

export default function DebugPage() {
  return <DebugClient />;
}
