import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SettingsMenu } from '@/components/settings/settings-menu';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('settings.title') };
}

/**
 * Settings home — the menu of settings sections, built from settings item
 * containers. The profile settings that used to be the initial page live
 * at `/settings/profile`; this page no longer redirects there.
 */
export default function SettingsPage() {
  return <SettingsMenu />;
}
