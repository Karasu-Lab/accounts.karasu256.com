'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { Button } from '@Hashibutogarasu/ui';
import { Input } from '@Hashibutogarasu/ui';
import { Label } from '@Hashibutogarasu/ui';

export interface DangerZoneProps {
  /** Whether the user has a `credential` (email/password) account. */
  hasPasswordProvider: boolean;
}

/**
 * Account deletion UI, via `authClient.deleteUser()`.
 * Password users confirm with their current password. OAuth/passkey-only
 * users rely on the session being "fresh" (signed in recently); if it
 * isn't, they're asked to sign out and back in first. `SettingsShell`'s
 * `authClient.useSession()` redirects to `/` once the account is gone.
 */
export function DangerZone({ hasPasswordProvider }: DangerZoneProps) {
  const t = useTranslations();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    try {
      const { error } = await authClient.deleteUser(hasPasswordProvider ? { password } : {});
      if (error) {
        const isSessionExpired = error.code === authClient.$ERROR_CODES.SESSION_EXPIRED.code;
        toast.error(isSessionExpired ? t('dangerZone.reauthRequired') : (error.message ?? t('dangerZone.reauthRequired')));
        setDeleting(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-destructive uppercase tracking-wide">{t('dangerZone.title')}</p>
      {!confirming ? (
        <Button variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive/5" onClick={() => setConfirming(true)}>
          {t('dangerZone.deleteAccount')}
        </Button>
      ) : (
        <form onSubmit={handleDelete} className="space-y-3">
          {hasPasswordProvider ? (
            <div className="space-y-1">
              <Label htmlFor="confirm-password">{t('dangerZone.confirmPassword')}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                disabled={deleting}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('dangerZone.reauthRequired')}</p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setConfirming(false)} disabled={deleting}>
              {t('dangerZone.cancel')}
            </Button>
            <Button type="submit" variant="destructive" className="flex-1" disabled={deleting}>
              {deleting ? t('dangerZone.deleting') : t('dangerZone.delete')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
