'use client';

import { AppWindow, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Dialog, DialogBackdrop, DialogClose, DialogPopup, DialogPortal, DialogTitle } from '@karasu-lab/ui';
import type { AuthorizedApp } from '@/lib/api/authorized-apps';
import { LoadingButton } from '@/components/ui/loading-button';

interface AuthorizedAppInfoDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  app: AuthorizedApp;
  revoking: boolean;
  onRevoke: (_app: AuthorizedApp) => void;
}

export function AuthorizedAppInfoDialog({ open, onOpenChange, app, revoking, onRevoke }: AuthorizedAppInfoDialogProps) {
  const t = useTranslations();
  const name = app.clientName ?? app.clientId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md w-full p-6 space-y-4">
          <DialogTitle className="sr-only">{name}</DialogTitle>

          <div className="flex justify-center" aria-hidden>
            {app.logoUri ? (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-foreground/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={app.logoUri} alt="" className="h-full w-full object-cover" />
              </span>
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-foreground/10">
                <AppWindow className="h-6 w-6 text-muted-foreground" />
              </span>
            )}
          </div>

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

          <div>
            <p className="text-sm font-medium">{t('authorizedApps.permissions')}</p>
            {app.scopes.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {app.scopes.map((scope) => {
                  const key = `authorizedApps.scopes.${scope}`;
                  return (
                    <li key={scope} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{t.has(key) ? t(key) : scope}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{t('authorizedApps.noPermissions')}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <LoadingButton variant="destructive" size="sm" disabled={revoking} loading={revoking} onClick={() => onRevoke(app)}>
              {t('authorizedApps.revoke')}
            </LoadingButton>
            <DialogClose render={<Button variant="ghost">{t('authorizedApps.done')}</Button>} />
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
