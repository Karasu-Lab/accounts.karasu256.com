'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Checkbox, Dialog, DialogPortal, DialogBackdrop, DialogPopup, DialogTitle, Label } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { savePendingAddAccount } from '@/lib/add-account';

export interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether to show the "switch to this account after adding" checkbox. Defaults to `false`. */
  showSwitchAccountCheckBox?: boolean;
}

/**
 * Sends the user to auth.karasu256.com to sign in to another account. The
 * previously active session is remembered so the settings shell can switch
 * back to it on return, since `multiSession` makes every new sign-in active.
 */
export function AddAccountDialog({ open, onOpenChange, showSwitchAccountCheckBox = false }: AddAccountDialogProps) {
  const t = useTranslations();
  const [switchToNewAccount, setSwitchToNewAccount] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    const { data } = await authClient.getSession();
    savePendingAddAccount({ previousSessionToken: data?.session.token ?? null, switchToNewAccount });

    const returnTo = new URL(window.location.pathname, window.location.origin);
    returnTo.searchParams.set('accountAdded', '1');
    const signIn = new URL('/sign-in', process.env.NEXT_PUBLIC_AUTH_URL);
    signIn.searchParams.set('prompt', 'login');
    signIn.searchParams.set('redirectTo', returnTo.toString());
    window.location.assign(signIn.toString());
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
