'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLinkSlash } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { AnimatedList, ConfirmDialog, SettingsAccordion, SettingsItem, Skeleton, toast } from '@karasu-lab/ui';
import { listAuthorizedApps, revokeAuthorizedApp, type AuthorizedApp } from '@/lib/api/authorized-apps';
import { LoadingButton } from '@/components/ui/loading-button';

/**
 * The authorized apps list: a vertically scrolling list of accordions,
 * one per app the user has authorized. Opening an app's accordion shows
 * the app's information and the permissions the user approved for it,
 * plus the control that revokes the authorization.
 */
export function AuthorizedAppsClient() {
  const t = useTranslations();
  const [apps, setApps] = useState<AuthorizedApp[] | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<AuthorizedApp | null>(null);

  useEffect(() => {
    listAuthorizedApps()
      .then(setApps)
      .catch(() => setApps([]));
  }, []);

  async function confirmRevoke() {
    if (!pendingRevoke) return;
    setRevokingId(pendingRevoke.id);
    try {
      await revokeAuthorizedApp(pendingRevoke.id);
      setApps((prev) => (prev ?? []).filter((app) => app.id !== pendingRevoke.id));
      toast.success(t('authorizedApps.revoked', { name: pendingRevoke.clientName ?? pendingRevoke.clientId }), { autoClose: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t('authorizedApps.title')}</h1>

      {apps === null ? (
        <AnimatedList className="space-y-3">
          {[0, 1].map((i) => (
            <li key={i}>
              <SettingsItem className="flex items-center gap-3">
                <Skeleton className="size-8 rounded shrink-0" />
                <Skeleton className="h-4 w-40" />
              </SettingsItem>
            </li>
          ))}
        </AnimatedList>
      ) : apps.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('authorizedApps.empty')}</p>
      ) : (
        <div className="max-h-[36rem] space-y-3 overflow-y-auto pr-1">
          {apps.map((app) => {
            const name = app.clientName ?? app.clientId;
            const isRevoking = revokingId === app.id;
            return (
              <SettingsAccordion
                key={app.id}
                defaultOpen={false}
                title={
                  <span className="flex items-center gap-2">
                    {app.logoUri ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={app.logoUri} alt="" className="size-6 rounded object-cover" />
                    ) : null}
                    <span className="truncate">{name}</span>
                  </span>
                }
              >
                <div className="space-y-4 pt-2">
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-muted-foreground">{t('authorizedApps.clientId')}</dt>
                      <dd className="min-w-0 truncate font-mono text-xs leading-5">{app.clientId}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-muted-foreground">{t('authorizedApps.authorizedAt')}</dt>
                      <dd>{new Date(app.createdAt).toLocaleDateString()}</dd>
                    </div>
                  </dl>

                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">{t('authorizedApps.permissions')}</p>
                    {app.scopes.length > 0 ? (
                      <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                        {app.scopes.map((scope) => {
                          const key = `authorizedApps.scopes.${scope}`;
                          return <li key={scope}>{t.has(key) ? t(key) : scope}</li>;
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('authorizedApps.noPermissions')}</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <LoadingButton
                      variant="destructive"
                      size="sm"
                      disabled={isRevoking}
                      loading={isRevoking}
                      onClick={() => setPendingRevoke(app)}
                      icon={<FontAwesomeIcon icon={faLinkSlash} />}
                    >
                      {t('authorizedApps.revoke')}
                    </LoadingButton>
                  </div>
                </div>
              </SettingsAccordion>
            );
          })}
        </div>
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
