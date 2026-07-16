'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogPortal, DialogBackdrop, DialogPopup, DialogTitle, Separator, toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { EmailPasswordForm } from '@/components/auth/email-password-form';
import { PasskeySection } from '@/components/auth/passkey-section';

export interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called after an account is successfully added, with the uid of the
   * session left active (confirmed via a fresh `authClient.getSession()`
   * call after switching back, not read off a caller-side session that may
   * not have caught up yet), so the caller can refresh its account list
   * against the account that is actually active.
   */
  onAdded?: (activeUid: string) => void;
  /**
   * Called with the session token of the newly added account when the user
   * checked "switch to this account after adding". Should perform the same
   * switch as the sidebar's own account switcher (including its overlay).
   */
  onSwitchAccount?: (sessionToken: string) => void | Promise<void>;
  /** Whether to show the "switch to this account after adding" checkbox. Defaults to `false`. */
  showSwitchAccountCheckBox?: boolean;
}

/**
 * Dialog for signing in to a second (or further) account without disturbing
 * the currently active session.
 *
 * better-auth's `multiSession` plugin already keeps every sign-in as an
 * additional device session (via a `_multi-<token>` cookie) instead of
 * replacing existing ones — a new sign-in just becomes the *active* one. So
 * this reuses the ordinary sign-in forms as-is, remembers which session was
 * active before the dialog opened, and switches back to it via
 * `authClient.multiSession.setActive()` once the new sign-in completes.
 *
 * When `showSwitchAccountCheckBox` is set and the user checks it, the newly
 * added account's session token (captured before switching back) is instead
 * handed to `onSwitchAccount` after the dialog closes, so the caller can
 * explicitly switch to it through the exact same path a manual switch from
 * the sidebar uses.
 */
export function AddAccountDialog({ open, onOpenChange, onAdded, onSwitchAccount, showSwitchAccountCheckBox = false }: AddAccountDialogProps) {
  const t = useTranslations();
  const previousSessionToken = useRef<string | null>(null);
  const [switchToNewAccount, setSwitchToNewAccount] = useState(false);

  useEffect(() => {
    if (!open) return;
    authClient.getSession().then(({ data }) => {
      previousSessionToken.current = data?.session.token ?? null;
    });
  }, [open]);

  async function handleSignedIn() {
    try {
      const { data: newSession } = await authClient.getSession();
      if (previousSessionToken.current) {
        await authClient.multiSession.setActive({ sessionToken: previousSessionToken.current });
      }
      onOpenChange(false);
      if (switchToNewAccount && newSession) {
        await onSwitchAccount?.(newSession.session.token);
      } else {
        /**
         * Read fresh rather than trusting `newSession` or the caller's own
         * session state: after `setActive` reverts to the previous session,
         * this is the only way to know for certain which account is active
         * now, instead of assuming the revert above landed as expected.
         */
        const { data: activeSession } = await authClient.getSession();
        if (activeSession) onAdded?.(activeSession.user.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>{t('settings.accountSwitcher.addAccount')}</DialogTitle>
          <EmailPasswordForm
            onSuccess={handleSignedIn}
            showSwitchAccountCheckBox={showSwitchAccountCheckBox}
            switchToNewAccount={switchToNewAccount}
            onSwitchToNewAccountChange={setSwitchToNewAccount}
          />
          <Separator className="my-4" />
          <PasskeySection onSuccess={handleSignedIn} />
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
