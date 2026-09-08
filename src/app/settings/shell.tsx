'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { listAccounts, switchAccount, removeAccount, type AccountSummary } from '@/lib/api/accounts';
import { Skeleton, SettingsSidebarLayout, SwitchingAccountOverlay } from '@Hashibutogarasu/ui';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';
import { AddAccountDialog } from '@/components/settings/add-account-dialog';
import { UserContext, type SettingsUser } from '@/components/settings/user-context';

interface SettingsShellProps {
  children: React.ReactNode;
  /**
   * "Back to app" URL, read server-side verbatim from `ROOT_APP_URL` (see
   * {@link getRootAppUrl}). That function throws when the env var is unset
   * in production, so `SettingsLayout` never renders this shell with a
   * guessed or missing URL in a deployed environment; outside production it
   * falls back to the local dev root app URL instead.
   */
  appUrl: string;
}

/**
 * Settings shell. Reads the better-auth session client-side via
 * `authClient.useSession()` and provides the authenticated user via
 * UserContext. Shows a generic skeleton in main content while the session
 * resolves, except on /settings/linking and /settings/profile, which always
 * render their children directly: /settings/linking so the provider buttons
 * can appear (disabled) without a skeleton, and /settings/profile so its
 * form is recognizable immediately, with `UserContext`'s `ready` flag false
 * (and a placeholder user) until the session resolves — see `ProfileSection`
 * for how it disables its own controls off of that flag.
 */
export function SettingsShell({ children, appUrl }: SettingsShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  /** Tagged with the user it belongs to, so a switched-to account starts with no stale override (see {@link userOverride} below) without needing an effect. */
  const [userOverrideState, setUserOverrideState] = useState<{ userId?: string; patch: Partial<SettingsUser> }>({ patch: {} });

  const isLinkingPage = pathname === '/settings/linking';
  const isProfilePage = pathname === '/settings/profile';
  const loading = isPending;

  const refreshAccounts = useCallback(async (activeUid: string | undefined) => {
    try {
      const result = await listAccounts();
      setAccounts(result.accounts.filter((a) => a.uid !== activeUid));
    } catch {
      /* noop — account switcher is a non-critical enhancement */
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace('/');
      return;
    }
    const activeUid = session.user.id;
    listAccounts()
      .then((result) => setAccounts(result.accounts.filter((a) => a.uid !== activeUid)))
      .catch(() => {});
  }, [isPending, session, router]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('addAccount') === '1') {
      setAddDialogOpen(true);
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    await authClient.signOut();
  }

  /**
   * Activates the given session token, refetches the current session, and
   * refreshes `accounts` against the uid the switch itself reports —
   * rather than relying on `authClient.useSession()`'s `session` (a stale
   * closure at call time) or on the `session`-watching effect above to
   * eventually notice the change — so the just-activated account stops
   * appearing as a switch target immediately, not after a follow-up render.
   * Toggles {@link switchingAccount} around all of this to drive the
   * overlay. Takes a token directly (rather than looking one up in
   * `accounts`) so it can also be used to switch to an account that hasn't
   * landed in `accounts` state yet, e.g. right after {@link AddAccountDialog}
   * adds one.
   */
  async function switchToSession(sessionToken: string) {
    setSwitchingAccount(true);
    try {
      const result = await switchAccount(sessionToken);
      await refetch();
      await refreshAccounts(result.uid);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      /** Resyncs `accounts` against the server so a stale/already-invalid entry that caused this failure doesn't linger and keep failing on retry. */
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
      /**
       * Awaited so the sidebar's remove button (whose spinner tracks this
       * promise) doesn't flip back to its idle state until `accounts` has
       * actually dropped this entry — otherwise it flashes re-enabled for a
       * render or two before the list catches up.
       */
      await refreshAccounts(session?.user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      /** Same self-heal as {@link switchToSession}'s catch — see there for why. */
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
      <AddAccountDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdded={(activeUid) => void refreshAccounts(activeUid)}
        onSwitchAccount={switchToSession}
        showSwitchAccountCheckBox
      />
      <SwitchingAccountOverlay open={switchingAccount} message={t('settings.accountSwitcher.switchingAccount')} />
    </>
  );
}
