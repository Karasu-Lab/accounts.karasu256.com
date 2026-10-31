'use client';

import { Check, CircleQuestionMark } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Dialog, DialogBackdrop, DialogClose, DialogPopup, DialogPortal, DialogTitle, R2Image } from '@karasu-lab/ui';
import type { OAuthClientSummary } from '@/lib/api/developer';

interface OAuthClientInfoDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  client: OAuthClientSummary;
}

/**
 * Shows a client's information in the same format as the OAuth consent
 * screen: the app's icon on its own (there is no source account to
 * connect from here, so no user icon or connection icon), then the
 * scopes container — the line naming the app as requesting the
 * following permissions and the vertical list of those scopes,
 * translated on the client. There are no approve / deny buttons: this
 * dialog only displays the client.
 */
export function OAuthClientInfoDialog({ open, onOpenChange, client }: OAuthClientInfoDialogProps) {
  const t = useTranslations();
  const name = client.client_name ?? client.client_id;
  const scopes = (client.scope?.split(' ') ?? []).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md w-full p-6 space-y-4">
          <DialogTitle className="sr-only">{name}</DialogTitle>

          <div className="flex justify-center" aria-hidden>
            {client.logo_uri ? (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-foreground/10">
                <R2Image src={client.logo_uri} alt="" width={48} height={48} className="h-full w-full object-cover" />
              </span>
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-foreground/10">
                <CircleQuestionMark className="h-6 w-6 text-muted-foreground" />
              </span>
            )}
          </div>

          <div>
            <p className="text-sm">{t('settings.developer.clientInfo.requesting', { name })}</p>
            {scopes.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {scopes.map((scope) => {
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
              <p className="mt-3 text-sm text-muted-foreground">{t('settings.developer.clientInfo.noScopes')}</p>
            )}
          </div>

          <div className="flex justify-end">
            <DialogClose render={<Button variant="ghost">{t('settings.developer.dialog.done')}</Button>} />
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
