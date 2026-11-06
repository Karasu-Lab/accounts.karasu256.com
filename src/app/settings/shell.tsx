'use client';

import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, LoadingView, Spinner } from '@karasu-lab/ui';
import { cn } from '@/lib/utils';
import { HeaderAccountMenu } from '@/components/settings/header-account-menu';
import { ErrorProvider, useClearError, useErrors } from '@/components/settings/error-context';
import { LoadingProvider, useIsLoading, useIsLoadingKey } from '@/components/settings/loading-context';
import { SettingsSessionProvider } from '@/components/settings/session-provider';
import { useSettingsMenu } from '@/components/settings/settings-menu-context';
import { UserContext, useSettingsUser } from '@/components/settings/user-context';
import type { SessionUser } from '@/lib/session-user';

interface SettingsShellProps {
  children: ReactNode;
  appUrl: string;
  initialUser: SessionUser | null;
}

export function SettingsShell({ children, appUrl, initialUser }: SettingsShellProps) {
  return (
    <LoadingProvider>
      <ErrorProvider>
        <SettingsSessionProvider initialUser={initialUser} appUrl={appUrl}>
          <SettingsShellChrome>{children}</SettingsShellChrome>
        </SettingsSessionProvider>
      </ErrorProvider>
    </LoadingProvider>
  );
}

function SettingsShellChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations();
  const userContext = useSettingsUser();
  const { appUrl, accounts, onSignOut, onSwitchAccount, onAddAccount, onRemoveAccount } = useSettingsMenu();
  const isLoading = useIsLoading();
  const signingOut = useIsLoadingKey('sign-out');
  const errors = useErrors();
  const clearError = useClearError();
  const errorEntry = errors.size > 0 ? [...errors][0] : undefined;

  const isMenuPage = pathname === '/settings';
  const showBackButton = !isMenuPage;

  const pageTitle = useMemo(() => {
    const titleByPrefix: [string, string][] = [
      ['/settings/profile', t('profile.title')],
      ['/settings/security', t('security.title')],
      ['/settings/linking', t('connections.title')],
      ['/settings/authorized-apps', t('authorizedApps.title')],
      ['/settings/developer', t('settings.developer.title')],
      ['/settings/debug', t('debug.title')],
    ];
    return titleByPrefix.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? t('settings.title');
  }, [pathname, t]);

  const headerUser = userContext.ready
    ? {
        uid: userContext.user.id,
        displayName: userContext.user.name,
        email: userContext.user.email,
        photoURL: userContext.user.image ?? null,
      }
    : null;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center border-b border-border bg-background px-4">
          <div
            aria-hidden={!showBackButton}
            className={cn(
              'flex shrink-0 items-center overflow-hidden transition-all duration-300 ease-in-out',
              showBackButton ? 'w-9 opacity-100' : 'pointer-events-none w-0 opacity-0'
            )}
          >
            <Link
              href="/settings"
              aria-label={t('settings.back')}
              tabIndex={showBackButton ? undefined : -1}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-5" />
            </Link>
          </div>
          <h1 className="truncate text-base font-semibold">{pageTitle}</h1>
          <div className="ml-auto flex shrink-0 items-center pl-4">
            <HeaderAccountMenu
              user={headerUser}
              appUrl={appUrl}
              onSignOut={onSignOut}
              accounts={accounts}
              onSwitchAccount={onSwitchAccount}
              onAddAccount={onAddAccount}
              onRemoveAccount={onRemoveAccount}
            />
          </div>
        </header>
        <main className="relative min-h-0 flex-1 overflow-auto px-6 py-8 lg:px-10">
          <UserContext.Provider key={userContext.ready ? userContext.user.id : 'pending'} value={userContext}>
            {children}
          </UserContext.Provider>
          {isLoading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/60">
              {signingOut ? <LoadingView message={t('settings.signingOut')} /> : <Spinner className="size-8" />}
            </div>
          )}
          {errorEntry && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/60">
              <div className="mx-4 w-full max-w-sm space-y-4 rounded-lg border border-border bg-background p-6 shadow-lg">
                <p className="text-sm text-destructive">{errorEntry[1]}</p>
                <div className="flex justify-end">
                  <Button onClick={() => clearError(errorEntry[0])}>{t('authorizedApps.done')}</Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
