'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from '@karasu-lab/ui';
import { authClient, getSignInUrl } from '@/lib/auth/client';
import { takePendingAddAccount } from '@/lib/add-account';
import { listAccounts, switchAccount, removeAccount, type AccountSummary } from '@/lib/api/accounts';
import { SwitchingAccountOverlay } from '@karasu-lab/ui';
import { AddAccountDialog } from '@/components/settings/add-account-dialog';
import { SettingsMenuContext } from '@/components/settings/settings-menu-context';
import { UserContext, type SettingsUser } from '@/components/settings/user-context';
import { useReportLoading } from '@/components/settings/loading-context';
import type { SessionUser } from '@/lib/session-user';

interface SettingsSessionProviderProps {
  children: ReactNode;
  appUrl: string;
  /**
   * The signed-in account, resolved server-side by the settings layout
   * before the page is sent. When present, the provider starts out
   * `ready` with this user, so account-dependent items render from the
   * first paint instead of appearing once the client-side session
   * fetch resolves. The client session still takes over as soon as it
   * loads.
   */
  initialUser: SessionUser | null;
}

/**
 * The settings session as a provider: everything in the settings
 * screens that needs client-side loading around the account lives
 * here — resolving the client session against the server-resolved
 * account, the device account list, and the account actions (switch,
 * remove, add, sign out) — and is served to the screens through
 * {@link UserContext} and {@link SettingsMenuContext}.
 *
 * Its loading is reported through the common loading interface
 * (see loading-context) instead of driving an indicator of its own:
 * the first load is covered by the server-resolved account when there
 * is one, so loading is reported only for the waits the server render
 * does not cover — the first load without a server-resolved account,
 * and any later refetch (as happens while switching accounts or
 * completing an added account).
 *
 * When there is no server-resolved user (no valid session cookie) the
 * provider falls back to waiting for the client-side session, which
 * then redirects to sign-in.
 */
export function SettingsSessionProvider({ children, appUrl, initialUser }: SettingsSessionProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  /** Tagged with its user so a switched-to account never inherits a stale override. */
  const [userOverrideState, setUserOverrideState] = useState<{ userId?: string; patch: Partial<SettingsUser> }>({ patch: {} });

  /**
   * Whether the client session has finished loading at least once.
   * Only loading past that point is reported (plus the first load
   * when there is no server-resolved account to cover it).
   */
  const [sessionLoadedOnce, setSessionLoadedOnce] = useState(false);
  useEffect(() => {
    if (!isPending) setSessionLoadedOnce(true);
  }, [isPending]);
  useReportLoading('session', isPending && (sessionLoadedOnce || !initialUser));

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

  return (
    <>
      <UserContext.Provider value={contextValue}>
        <SettingsMenuContext.Provider value={menuContextValue}>{children}</SettingsMenuContext.Provider>
      </UserContext.Provider>
      <AddAccountDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} showSwitchAccountCheckBox />
      <SwitchingAccountOverlay open={switchingAccount} message={t('settings.accountSwitcher.switchingAccount')} />
    </>
  );
}
