import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getRootAppUrl } from '@Hashibutogarasu/utils/server';
import { SettingsShell } from './shell';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('settings.title') };
}

/**
 * Settings layout. Reads the "back to app" URL server-side from
 * `ROOT_APP_URL` and passes it down as {@link SettingsShell}'s `appUrl`.
 * Deriving it purely from the client's hostname (an earlier approach)
 * collapsed preview hosts with more than one subdomain label
 * (`dev.accounts.karasu256.com`) to the production root domain instead of
 * the sibling preview app.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsShell appUrl={await getRootAppUrl()}>{children}</SettingsShell>;
}
