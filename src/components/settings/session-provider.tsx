'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthClient } from '@/lib/auth/client';
import { buildSignInUrl } from '@/lib/auth/client-config';
import { takePendingAddAccount } from '@/lib/add-account';
import { listAccounts, switchAccount, removeAccount, type AccountSummary } from '@/lib/api/accounts';
import { SwitchingAccountOverlay } from '@karasu-lab/ui';
import { AddAccountDialog } from '@/components/settings/add-account-dialog';
import { SettingsMenuContext } from '@/components/settings/settings-menu-context';
import { UserContext, type SettingsUser } from '@/components/settings/user-context';
import { useReportError } from '@/components/settings/error-context';
import { useReportLoading } from '@/components/settings/loading-context';
import type { SessionUser } from '@/lib/session-user';

interface SettingsSessionProviderProps {
  children: ReactNode;
  appUrl: string;
  initialUser: SessionUser | null;
}

export function SettingsSessionProvider({ children, appUrl, initialUser }: SettingsSessionProviderProps) {
  const { authClient, config } = useAuthClient();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const { data: session, isPending, refetch } = authClient.useSession();
  const reportError = useReportError();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  useReportLoading('sign-out', signingOut);
  const [userOverrideState, setUserOverrideState] = useState<{ userId?: string; patch: Partial<SettingsUser> }>({ patch: {} });

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
    }
  }, []);

  const sessionRetriedRef = useRef(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      if (!initialUser) {
        window.location.replace(buildSignInUrl(config.authUrl, window.location.href));
        return;
      }
      if (!sessionRetriedRef.current) {
        sessionRetriedRef.current = true;
        void refetch();
      }
      return;
    }
    const activeUid = session.user.id;
    listAccounts()
      .then((result) => setAccounts(result.accounts.filter((a) => a.uid !== activeUid)))
      .catch(() => {});
  }, [isPending, session, router, initialUser, refetch]);

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
    setSigningOut(true);
    try {
      await authClient.signOut();
      window.location.replace(buildSignInUrl(config.authUrl, window.location.href));
    } catch (err) {
      setSigningOut(false);
      reportError(err, 'sign-out');
    }
  }

  async function switchToSession(sessionToken: string) {
    setSwitchingAccount(true);
    try {
      const result = await switchAccount(sessionToken);
      await refetch();
      await refreshAccounts(result.uid);
    } catch (err) {
      reportError(err);
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
      await refreshAccounts(session?.user.id);
    } catch (err) {
      reportError(err);
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
