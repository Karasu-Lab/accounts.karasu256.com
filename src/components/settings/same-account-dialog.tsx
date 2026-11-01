'use client';

import { useTranslations } from 'next-intl';
import { Button, Dialog, DialogBackdrop, DialogClose, DialogPopup, DialogPortal, DialogTitle } from '@karasu-lab/ui';

export interface SameAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Tells the user that the account they signed in with while adding an
 * account is the account that was already active, so the same account
 * cannot be added: no account was added, and the active account was
 * left as it is.
 */
export function SameAccountDialog({ open, onOpenChange }: SameAccountDialogProps) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>{t('settings.accountSwitcher.sameAccount.title')}</DialogTitle>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">{t('settings.accountSwitcher.sameAccount.description')}</p>
            <DialogClose
              render={
                <Button className="w-full" onClick={() => onOpenChange(false)}>
                  {t('settings.accountSwitcher.sameAccount.close')}
                </Button>
              }
            />
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
