'use client';

import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LoadingView, Spinner } from '@karasu-lab/ui';
import { cn } from '@/lib/utils';
import { HeaderAccountMenu } from '@/components/settings/header-account-menu';
import { LoadingProvider, useIsLoading, useIsLoadingKey } from '@/components/settings/loading-context';
import { SettingsSessionProvider } from '@/components/settings/session-provider';
import { useSettingsMenu } from '@/components/settings/settings-menu-context';
import { UserContext, useSettingsUser } from '@/components/settings/user-context';
import type { SessionUser } from '@/lib/session-user';

interface SettingsShellProps {
  children: ReactNode;
  appUrl: string;
  /**
   * The signed-in account, resolved server-side by the settings layout
   * before the page is sent; see {@link SettingsSessionProvider}.
   */
  initialUser: SessionUser | null;
}

/**
 * The settings shell: a header carrying the current page's title —
 * with a back link to the menu on subpages, in the slot the abolished
 * drawer's menu button used to occupy — above the page content, with
 * the account menu at the header's right end.
 *
 * Everything that needs client-side loading lives in providers under
 * the shell: {@link SettingsSessionProvider} resolves the account and
 * serves the screens' account data and actions, and loading across
 * all of them is managed through the common loading interface
 * ({@link LoadingProvider}). While any reported loading is in
 * progress, the shell overlays a spinner at the center of the content
 * area; the content itself always renders — there is no skeleton and
 * no per-screen loading placeholder in the shell.
 *
 * The page subtree is keyed by the resolved account, so switching
 * accounts remounts the screen instead of carrying the previous
 * account's screen state over.
 */
export function SettingsShell({ children, appUrl, initialUser }: SettingsShellProps) {
  return (
    <LoadingProvider>
      <SettingsSessionProvider initialUser={initialUser} appUrl={appUrl}>
        <SettingsShellChrome>{children}</SettingsShellChrome>
      </SettingsSessionProvider>
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

  const isMenuPage = pathname === '/settings';
  /** The back button replaces the drawer menu button and is shown only on subpages, where a way back to the menu is needed. */
  const showBackButton = !isMenuPage;

  /** Header title for the current settings page, keyed by its route. */
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

  /** Active account shown as the header account menu's icon, following optimistic profile updates. */
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
          {/*
           * The back button stays mounted and its slot animates between
           * w-9 and w-0 (with a fade), so the title next to it slides
           * smoothly instead of jumping: it shifts to a position clear
           * of the button while the button is shown, and animates back
           * to its original position when the button is not needed.
           * While hidden the button is inert — no pointer events, no
           * tab focus, and hidden from assistive technology.
           */}
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
        </main>
      </div>
    </>
  );
}
