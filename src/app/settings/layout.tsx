import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SettingsLayoutClient } from './layout-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('settings.title') };
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsLayoutClient>{children}</SettingsLayoutClient>;
}
