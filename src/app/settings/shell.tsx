'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from '@Hashibutogarasu/ui';
import { authClient, getSignInUrl } from '@/lib/auth/client';
import { takePendingAddAccount } from '@/lib/add-account';
import { listAccounts, switchAccount, removeAccount, type AccountSummary } from '@/lib/api/accounts';
import { Skeleton, SettingsSidebarLayout, SwitchingAccountOverlay } from '@Hashibutogarasu/ui';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';
import { AddAccountDialog } from '@/components/settings/add-account-dialog';
import { UserContext, type SettingsUser } from '@/components/settings/user-context';

interface SettingsShellProps {
  children: React.ReactNode;
  appUrl: string;
}

/**
 * /settings/linking and /settings/profile skip the loading skeleton so their
 * controls are recognizable immediately, rendered disabled until the session resolves.
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

  const isLinkingPage = pathname === '/settings/linking';
  const isProfilePage = pathname === '/settings/profile';
  const loading = isPending;

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

  const sidebarUser = useMemo(() => {
    if (!session) return null;
    return {
      uid: session.user.id,
      displayName: session.user.name,
      email: session.user.email,
      photoURL: session.user.image ?? null,
    };
  }, [session]);

  function renderContent() {
    if (isLinkingPage) {
      return <>{children}</>;
    }
    if (isProfilePage) {
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
      <SettingsSidebarLayout
        sidebar={
          <SettingsSidebar
            user={sidebarUser}
            appUrl={appUrl}
            onSignOut={handleSignOut}
            accounts={accounts}
            onSwitchAccount={handleSwitchAccount}
            onAddAccount={() => setAddDialogOpen(true)}
            onRemoveAccount={handleRemoveAccount}
          />
        }
      >
        {renderContent()}
      </SettingsSidebarLayout>
      <AddAccountDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} showSwitchAccountCheckBox />
      <SwitchingAccountOverlay open={switchingAccount} message={t('settings.accountSwitcher.switchingAccount')} />
    </>
  );
}
