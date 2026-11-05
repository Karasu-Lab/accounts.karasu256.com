'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Checkbox, Dialog, DialogPortal, DialogBackdrop, DialogPopup, DialogTitle, Label } from '@karasu-lab/ui';
import { buildUri } from '@karasu-lab/utils/uri';
import { useAuthClient } from '@/lib/auth/client';
import { savePendingAddAccount } from '@/lib/add-account';

export interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showSwitchAccountCheckBox?: boolean;
}

export function AddAccountDialog({ open, onOpenChange, showSwitchAccountCheckBox = false }: AddAccountDialogProps) {
  const { authClient, config } = useAuthClient();
  const t = useTranslations();
  const [switchToNewAccount, setSwitchToNewAccount] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    const { data } = await authClient.getSession();
    savePendingAddAccount({ previousSessionToken: data?.session.token ?? null, switchToNewAccount });

    const returnTo = buildUri(new URL(window.location.pathname, window.location.origin).toString(), { accountAdded: '1' });
    const signIn = buildUri(new URL('/sign-in', config.authUrl).toString(), { prompt: 'login', next: returnTo });
    window.location.assign(signIn);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>{t('settings.accountSwitcher.addAccount')}</DialogTitle>
          <div className="space-y-4 pt-4">
            {showSwitchAccountCheckBox && (
              <div className="flex items-center gap-2">
                <Checkbox id="switch-to-new-account" checked={switchToNewAccount} onCheckedChange={setSwitchToNewAccount} disabled={loading} />
                <Label htmlFor="switch-to-new-account" className="font-normal text-sm">
                  {t('settings.accountSwitcher.switchAfterAdd')}
                </Label>
              </div>
            )}
            <Button className="w-full" onClick={handleContinue} disabled={loading}>
              {t('settings.accountSwitcher.continueToSignIn')}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
