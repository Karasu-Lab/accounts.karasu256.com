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
import { Skeleton, SwitchingAccountOverlay } from '@karasu-lab/ui';
import { AddAccountDialog } from '@/components/settings/add-account-dialog';
import { SettingsMenuContext } from '@/components/settings/settings-menu-context';
import { UserContext, type SettingsUser } from '@/components/settings/user-context';

interface SettingsShellProps {
  children: React.ReactNode;
  appUrl: string;
}

/**
 * /settings/linking, /settings/profile, and the /settings menu skip the
 * loading skeleton so their controls are recognizable immediately,
 * rendered disabled until the session resolves.
 *
 * There is no sidebar (drawer) and no drawer menu button: navigation
 * lives in the settings menu at `/settings`, and this shell only renders
 * a header carrying the current page's title — with a back link to the
 * menu on subpages — above the page content. The shell also provides the
 * menu page with the account actions the drawer used to host (switching
 * and removing accounts, adding an account, signing out) through
 * {@link SettingsMenuContext}.
 */
export function SettingsShell({ children, appUrl }: SettingsShellProps) {
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
  const isLinkingPage = pathname === '/settings/linking';
  const isProfilePage = pathname === '/settings/profile';
  const loading = isPending;

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
    if (!session) {
      const pendingUser: SettingsUser = { id: '', email: '', emailVerified: false, name: '', image: null };
      return { user: pendingUser, ready: false, updateUser };
    }
    const userOverride = userOverrideState.userId === session.user.id ? userOverrideState.patch : {};
    return { user: { ...session.user, ...userOverride }, ready: true, updateUser };
  }, [session, userOverrideState, updateUser]);

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

  function renderContent() {
    if (isLinkingPage) {
      return <>{children}</>;
    }
    if (isMenuPage || isProfilePage) {
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
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-1 border-b border-border bg-background px-4">
          {!isMenuPage && (
            <Link
              href="/settings"
              aria-label={t('settings.back')}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-5" />
            </Link>
          )}
          <h1 className="truncate text-base font-semibold">{pageTitle}</h1>
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
