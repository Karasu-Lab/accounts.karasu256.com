'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppWindow } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, ConfirmDialog, toast } from '@karasu-lab/ui';
import { listAuthorizedApps, revokeAuthorizedApp, type AuthorizedApp } from '@/lib/api/authorized-apps';
import { useAuthClient } from '@/lib/auth/client';
import { SettingsItemContainer, SettingsItemGroup } from '@/components/settings/settings-item-container';
import { AuthorizedAppInfoDialog } from '@/components/settings/authorized-app-info-dialog';
import { useReportLoading } from '@/components/settings/loading-context';

/**
 * Load state of the authorized apps list. Loading, failed, and loaded
 * (which may still be empty) are distinct states so the UI switches its
 * display explicitly instead of guessing from a shared flag — a failed
 * load in particular must never read as "no authorized apps".
 */
type ListState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; apps: AuthorizedApp[] };

/** Icon tile color of the authorized apps items, matching this section's entry in the settings menu. */
const APP_ICON_BACKGROUND_COLOR = '#ea580c';

/**
 * The authorized apps list: one settings item per app the user has
 * authorized, in a settings item group. Selecting an item opens the
 * app's information dialog — its client ID, authorization date, and
 * the permissions the user approved for it, in consent screen format —
 * which also carries the control that revokes the authorization.
 *
 * The list's loading is reported through the common loading interface,
 * so the shell presents it with the shared centered spinner; the
 * screen itself renders nothing extra for the loading state. A failed
 * load and an empty loaded list keep their own displays here.
 */
export function AuthorizedAppsClient() {
  const auth = useAuthClient();
  const t = useTranslations();
  const [state, setState] = useState<ListState>({ status: 'loading' });
  useReportLoading('authorized-apps', state.status === 'loading');
  const [infoApp, setInfoApp] = useState<AuthorizedApp | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<AuthorizedApp | null>(null);

  const reload = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'loaded', apps: await listAuthorizedApps(auth) });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function confirmRevoke() {
    if (!pendingRevoke) return;
    setRevokingId(pendingRevoke.id);
    try {
      await revokeAuthorizedApp(auth, pendingRevoke.id);
      setState((prev) => (prev.status === 'loaded' ? { status: 'loaded', apps: prev.apps.filter((app) => app.id !== pendingRevoke.id) } : prev));
      toast.success(t('authorizedApps.revoked', { name: pendingRevoke.clientName ?? pendingRevoke.clientId }), { autoClose: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {state.status === 'error' ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-destructive">{t('authorizedApps.loadError')}</p>
          <Button variant="ghost" size="sm" onClick={() => void reload()}>
            {t('authorizedApps.retry')}
          </Button>
        </div>
      ) : state.status === 'loaded' && state.apps.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('authorizedApps.empty')}</p>
      ) : state.status === 'loaded' ? (
        <SettingsItemGroup>
          {state.apps.map((app) => (
            <SettingsItemContainer
              key={app.id}
              title={app.clientName ?? app.clientId}
              description={`${t('authorizedApps.authorizedAt')}: ${new Date(app.createdAt).toLocaleDateString()}`}
              icon={AppWindow}
              iconImageSrc={app.logoUri}
              iconBackgroundColor={APP_ICON_BACKGROUND_COLOR}
              onClick={() => setInfoApp(app)}
            />
          ))}
        </SettingsItemGroup>
      ) : null}

      {infoApp && (
        <AuthorizedAppInfoDialog
          open={infoApp !== null}
          onOpenChange={(open) => {
            if (!open) setInfoApp(null);
          }}
          app={infoApp}
          revoking={revokingId === infoApp.id}
          onRevoke={(app) => {
            setInfoApp(null);
            setPendingRevoke(app);
          }}
        />
      )}

      <ConfirmDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevoke(null);
        }}
        title={t('authorizedApps.revokeConfirm.title')}
        description={t('authorizedApps.revokeConfirm.description', {
          name: pendingRevoke?.clientName ?? pendingRevoke?.clientId ?? '',
        })}
        confirmLabel={t('authorizedApps.revokeConfirm.confirm')}
        cancelLabel={t('authorizedApps.revokeConfirm.cancel')}
        onConfirm={confirmRevoke}
      />
    </div>
  );
}
