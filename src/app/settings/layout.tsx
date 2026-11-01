import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getRootAppUrl } from '@karasu-lab/utils/server';
import { getSessionUser } from '@/lib/session-user';
import { AuthClientProvider } from '@/lib/auth/client';
import { getClientConfig } from '@/lib/auth/client-config';
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
 *
 * It also resolves the signed-in account server-side and hands it to the
 * shell as the initial user: the settings pages are not sent until the
 * account has finished loading, so account-dependent items (such as the
 * menu's profile item) render with the account from the very first
 * paint instead of appearing once a client-side session fetch resolves.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [appUrl, initialUser] = await Promise.all([getRootAppUrl(), getSessionUser()]);
  return (
    <AuthClientProvider config={getClientConfig()}>
      <SettingsShell appUrl={appUrl} initialUser={initialUser}>
        {children}
      </SettingsShell>
    </AuthClientProvider>
  );
}
