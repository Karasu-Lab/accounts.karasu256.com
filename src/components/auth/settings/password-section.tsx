'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { setPassword as setPasswordRequest } from '@/lib/api/set-password';
import { useSettingsUser } from '@/components/settings/user-context';
import { Button } from '@Hashibutogarasu/ui';
import { Label } from '@Hashibutogarasu/ui';
import { PasswordInput } from '@Hashibutogarasu/ui';
import { LocalizedPasswordStrengthIndicator } from '@/components/auth/localized-password-strength-indicator';

export interface PasswordSectionProps {
  /** Whether the user already has a `credential` (email/password) account. */
  hasPasswordProvider: boolean;
  /** Called after successfully setting a password for the first time. */
  onPasswordSet: () => void;
}

/**
 * Allows email users to set or change their password.
 *
 * - No `credential` account yet: sets one via `POST /api/auth/set-password`
 *   (wrapping better-auth's server-only `auth.api.setPassword`).
 * - Has a `credential` account: calls `authClient.changePassword()`, which
 *   verifies `currentPassword` itself.
 *
 * Hidden for users with no email address.
 */
export function PasswordSection({ hasPasswordProvider, onPasswordSet }: PasswordSectionProps) {
  const t = useTranslations();
  const { user } = useSettingsUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user.email) return null;

  function showError(code: string | undefined) {
    const key = `security.error.${(code ?? 'unknown').toLowerCase()}`;
    toast.error(t.has(key) ? t(key) : t('security.error.unknown'));
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
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('security.title')}</p>
      <form onSubmit={handleSubmit} className="space-y-3">
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
        <Button type="submit" variant="outline" className="w-full" disabled={saving}>
          {hasPasswordProvider
            ? saving
              ? t('security.changing')
              : t('security.changePassword')
            : saving
              ? t('security.setting')
              : t('security.setPassword')}
        </Button>
      </form>
    </div>
  );
}
