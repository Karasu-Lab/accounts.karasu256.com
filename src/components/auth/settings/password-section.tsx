'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from '@karasu-lab/ui';
import { authClient } from '@/lib/auth/client';
import { setPassword as setPasswordRequest } from '@/lib/api/set-password';
import { useSettingsUser } from '@/components/settings/user-context';
import { Button, Dialog, DialogBackdrop, DialogPopup, DialogPortal, DialogTitle, Label, PasswordInput } from '@karasu-lab/ui';
import { LocalizedPasswordStrengthIndicator } from '@/components/auth/localized-password-strength-indicator';
import { EditableSettingsItem } from '@/components/settings/editable-settings-item';

export interface PasswordSectionProps {
  /** Whether the user already has a `credential` (email/password) account. */
  hasPasswordProvider: boolean;
  /** Called after successfully setting a password for the first time. */
  onPasswordSet: () => void;
}

/**
 * The password item of the security settings, shown as an
 * {@link EditableSettingsItem}: its value is a mask when a password is
 * set and a "not set" label otherwise, and pressing it opens a dialog
 * that sets or changes the password.
 *
 * - No `credential` account yet: sets one via `POST /api/auth/set-password`
 *   (wrapping better-auth's server-only `auth.api.setPassword`).
 * - Has a `credential` account: calls `authClient.changePassword()`, which
 *   verifies `currentPassword` itself.
 *
 * Hidden for users with no email address once the session has resolved;
 * while it is still resolving, the item renders disabled instead of
 * being replaced with a skeleton.
 */
export function PasswordSection({ hasPasswordProvider, onPasswordSet }: PasswordSectionProps) {
  const t = useTranslations();
  const { user, ready } = useSettingsUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (ready && !user.email) return null;

  function showError(code: string | undefined) {
    const key = `security.error.${(code ?? 'unknown').toLowerCase()}`;
    toast.error(t.has(key) ? t(key) : t('security.error.unknown'));
  }

  function handleOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setCurrentPassword('');
      setNewPassword('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (hasPasswordProvider) {
        const { error } = await authClient.changePassword({ currentPassword, newPassword });
        if (error) {
          showError(error.code);
          return;
        }
        toast.success(t('security.passwordChanged'));
      } else {
        await setPasswordRequest(newPassword);
        onPasswordSet();
        toast.success(t('security.passwordSet'));
      }
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const actionLabel = hasPasswordProvider ? t('security.changePassword') : t('security.setPassword');

  return (
    <>
      <EditableSettingsItem
        label={t('security.password')}
        value={hasPasswordProvider ? '••••••••' : t('security.passwordNotSet')}
        onEdit={() => setDialogOpen(true)}
        editLabel={actionLabel}
        pressable
        disabled={!ready}
      />
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>{actionLabel}</DialogTitle>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {hasPasswordProvider && (
                <div className="space-y-1">
                  <Label htmlFor="current-password">{t('security.currentPassword')}</Label>
                  <PasswordInput
                    id="current-password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="new-password">{t('security.newPassword')}</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={saving}
                />
                <LocalizedPasswordStrengthIndicator password={newPassword} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
                  {t('dangerZone.cancel')}
                </Button>
                <Button type="submit" disabled={saving}>
                  {hasPasswordProvider
                    ? saving
                      ? t('security.changing')
                      : t('security.changePassword')
                    : saving
                      ? t('security.setting')
                      : t('security.setPassword')}
                </Button>
              </div>
            </form>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
