'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from '@karasu-lab/ui';
import { authClient, getSignInUrl } from '@/lib/auth/client';
import { takePendingAddAccount } from '@/lib/add-account';
import { listAccounts, switchAccount, removeAccount, type AccountSummary } from '@/lib/api/accounts';
import { ProgressBar, Skeleton, SwitchingAccountOverlay } from '@karasu-lab/ui';
import { cn } from '@/lib/utils';
import { AddAccountDialog } from '@/components/settings/add-account-dialog';
import { HeaderAccountMenu } from '@/components/settings/header-account-menu';
import { SettingsMenuContext } from '@/components/settings/settings-menu-context';
import { UserContext, type SettingsUser } from '@/components/settings/user-context';
import type { SessionUser } from '@/lib/session-user';

interface SettingsShellProps {
  children: React.ReactNode;
  appUrl: string;
  /**
   * The signed-in account, resolved server-side by the settings layout
   * before the page is sent. When present, the shell starts out `ready`
   * with this user, so account-dependent items render from the first
   * paint instead of appearing once the client-side session fetch
   * resolves. The client session still takes over as soon as it loads.
   */
  initialUser: SessionUser | null;
}

/**
 * /settings/linking, /settings/profile, /settings/security,
 * /settings/debug, and the /settings menu skip the loading skeleton so
 * their controls are recognizable immediately, rendered disabled until
 * the session resolves. The debug screen's content does not depend on
 * the session at all — its API values arrive with the page and its
 * flags resolve on their own — so it renders from the first paint.
 *
 * The account itself is resolved server-side by the settings layout
 * before the page is sent ({@link SettingsShellProps.initialUser}), so
 * the shell starts out ready with it: server rendering simply waits
 * for the account, and no client-side loading overlay or pop-in is
 * involved. Only when there is no server-resolved user (no valid
 * session cookie) does the shell fall back to waiting for the
 * client-side session, which then redirects to sign-in.
 *
 * There is no sidebar (drawer) and no drawer menu button: navigation
 * lives in the settings menu at `/settings`, and this shell only renders
 * a header carrying the current page's title — with a back link to the
 * menu on subpages, in the slot the drawer menu button used to occupy —
 * above the page content. The back button is only shown when needed
 * (on subpages); its slot animates its width open and closed, so the
 * title slides with it to a position clear of the button and animates
 * back to its original position when the button is gone. At the header's
 * right end sits the account icon, which opens the account menu the
 * drawer used to host. Attached to the header's bottom edge is a
 * progress bar for client-side loading: the first load is covered by
 * the server-resolved account, so the bar appears for later loading
 * (transitions such as account switching refetches), and for the first
 * load only when there is no server-resolved account. The shell also provides the
 * menu page with the account actions the drawer used to host (switching
 * and removing accounts, adding an account, signing out) through
 * {@link SettingsMenuContext}.
 */
export function SettingsShell({ children, appUrl, initialUser }: SettingsShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  /** Tagged with its user so a switched-to account never inherits a stale override. */
  const [userOverrideState, setUserOverrideState] = useState<{ userId?: string; patch: Partial<SettingsUser> }>({ patch: {} });

  const isMenuPage = pathname === '/settings';
  /** The back button replaces the drawer menu button and is shown only on subpages, where a way back to the menu is needed. */
  const showBackButton = !isMenuPage;
  const isLinkingPage = pathname === '/settings/linking';
  const isProfilePage = pathname === '/settings/profile';
  const isSecurityPage = pathname === '/settings/security';
  const isDebugPage = pathname === '/settings/debug';
  /** With a server-resolved initial user there is nothing to wait for: the account is already loaded. */
  const loading = isPending && !initialUser;
  /**
   * Whether the client session has finished loading at least once.
   * The header progress bar is the indicator for client-side loading
   * after that point (a refetch while switching accounts or completing
   * an added account): the first load is already covered by the
   * server-resolved user, so the bar stays hidden for it and appears
   * only for later transitions. Without a server-resolved user the
   * first load is not covered, and the bar shows for it as well.
   */
  const [sessionLoadedOnce, setSessionLoadedOnce] = useState(false);
  useEffect(() => {
    if (!isPending) setSessionLoadedOnce(true);
  }, [isPending]);
  const showProgressBar = isPending && (sessionLoadedOnce || !initialUser);

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

  const refreshAccounts = useCallback(async (activeUid: string | undefined) => {
    try {
      const result = await listAccounts();
      setAccounts(result.accounts.filter((a) => a.uid !== activeUid));
    } catch {
      /* The account switcher is non-critical, so a failed refresh keeps the current list. */
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      window.location.replace(getSignInUrl(window.location.href));
      return;
    }
    const activeUid = session.user.id;
    listAccounts()
      .then((result) => setAccounts(result.accounts.filter((a) => a.uid !== activeUid)))
      .catch(() => {});
  }, [isPending, session, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('addAccount') === '1') {
      setAddDialogOpen(true);
      router.replace(pathname);
    }
    if (params.get('accountAdded') === '1') {
      router.replace(pathname);
      void completeAddAccount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function completeAddAccount() {
    const pending = takePendingAddAccount();
    const { data: newSession } = await authClient.getSession();
    if (!pending?.previousSessionToken || !newSession || pending.switchToNewAccount) {
      await refetch();
      await refreshAccounts(newSession?.user.id);
      return;
    }
    await switchToSession(pending.previousSessionToken);
  }

  async function handleSignOut() {
    await authClient.signOut();
  }

  /** Refreshes `accounts` against the uid the switch reports, since `session` is a stale closure here. */
  async function switchToSession(sessionToken: string) {
    setSwitchingAccount(true);
    try {
      const result = await switchAccount(sessionToken);
      await refetch();
      await refreshAccounts(result.uid);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      /** Resyncs so a stale entry that caused this failure doesn't keep failing on retry. */
      await refreshAccounts(session?.user.id);
    } finally {
      setSwitchingAccount(false);
    }
  }

  async function handleSwitchAccount(uid: string) {
    const target = accounts.find((a) => a.uid === uid);
    if (!target) return;
    await switchToSession(target.sessionToken);
  }

  async function handleRemoveAccount(uid: string) {
    const target = accounts.find((a) => a.uid === uid);
    if (!target) return;
    try {
      await removeAccount(target.sessionToken);
      /** Awaited so the remove button's spinner doesn't flash idle before the entry disappears. */
      await refreshAccounts(session?.user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      await refreshAccounts(session?.user.id);
    }
  }

  const updateUser = useCallback(
    (patch: Partial<SettingsUser>) => {
      setUserOverrideState((prev) => ({
        userId: session?.user.id,
        patch: prev.userId === session?.user.id ? { ...prev.patch, ...patch } : patch,
      }));
    },
    [session?.user.id]
  );

  const contextValue = useMemo(() => {
    if (!session && initialUser) {
      /* Server-resolved account: ready from the first paint, so items that
         depend on the account never appear or disappear after the fact. */
      const baseUser: SettingsUser = {
        id: initialUser.id,
        email: initialUser.email ?? '',
        emailVerified: false,
        name: initialUser.name ?? '',
        image: initialUser.image,
      };
      const userOverride = userOverrideState.userId === initialUser.id ? userOverrideState.patch : {};
      return { user: { ...baseUser, ...userOverride }, ready: true, updateUser };
    }
    if (!session) {
      const pendingUser: SettingsUser = { id: '', email: '', emailVerified: false, name: '', image: null };
      return { user: pendingUser, ready: false, updateUser };
    }
    const userOverride = userOverrideState.userId === session.user.id ? userOverrideState.patch : {};
    return { user: { ...session.user, ...userOverride }, ready: true, updateUser };
  }, [session, initialUser, userOverrideState, updateUser]);

  const menuContextValue = useMemo(
    () => ({
      appUrl,
      accounts,
      onSignOut: handleSignOut,
      onSwitchAccount: handleSwitchAccount,
      onAddAccount: () => setAddDialogOpen(true),
      onRemoveAccount: handleRemoveAccount,
    }),
    // The handlers read the latest `accounts` / `session` on each render of the menu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appUrl, accounts, session?.user.id]
  );

  /** Active account shown as the header account menu's icon, following optimistic profile updates. */
  const headerUser = contextValue.ready
    ? {
        uid: contextValue.user.id,
        displayName: contextValue.user.name,
        email: contextValue.user.email,
        photoURL: contextValue.user.image ?? null,
      }
    : null;

  function renderContent() {
    if (isLinkingPage) {
      return <>{children}</>;
    }
    if (isMenuPage || isProfilePage || isSecurityPage || isDebugPage) {
      return (
        <UserContext.Provider key={contextValue.ready ? contextValue.user.id : 'pending'} value={contextValue}>
          {children}
        </UserContext.Provider>
      );
    }
    if (loading || !session) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-full" />
        </div>
      );
    }
    return (
      <UserContext.Provider key={contextValue.user.id} value={contextValue}>
        {children}
      </UserContext.Provider>
    );
  }

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
              onSignOut={handleSignOut}
              accounts={accounts}
              onSwitchAccount={handleSwitchAccount}
              onAddAccount={() => setAddDialogOpen(true)}
              onRemoveAccount={handleRemoveAccount}
            />
          </div>
          {/*
           * Loading progress bar, attached to the bottom edge of the
           * header: it is shown while the client session is loading
           * past the first, server-covered load (transitions such as
           * account switching refetches) and hidden once loading
           * finishes, fading between the two states. The bar itself is
           * the shadcn ProgressBar, swept across its track as an
           * indeterminate indicator.
           */}
          <div
            aria-hidden={!showProgressBar}
            className={cn('absolute inset-x-0 top-full transition-opacity duration-300', showProgressBar ? 'opacity-100' : 'pointer-events-none opacity-0')}
          >
            <div className="h-0.5 overflow-hidden">
              <ProgressBar
                value={1}
                className={cn('h-full w-1/3 rounded-none bg-transparent', showProgressBar && 'animate-[progress-indeterminate_1.2s_ease-in-out_infinite]')}
              />
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto px-6 py-8 lg:px-10">
          <SettingsMenuContext.Provider value={menuContextValue}>{renderContent()}</SettingsMenuContext.Provider>
        </main>
      </div>
      <AddAccountDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} showSwitchAccountCheckBox />
      <SwitchingAccountOverlay open={switchingAccount} message={t('settings.accountSwitcher.switchingAccount')} />
    </>
  );
}
