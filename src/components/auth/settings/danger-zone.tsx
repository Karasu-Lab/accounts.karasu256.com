'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from '@karasu-lab/ui';
import { useAuthClient } from '@/lib/auth/client';
import { Button } from '@karasu-lab/ui';
import { Input } from '@karasu-lab/ui';
import { Label } from '@karasu-lab/ui';
import { EditableSettingsItem } from '@/components/settings/editable-settings-item';
import { useReportError } from '@/components/settings/error-context';

export interface DangerZoneProps {
  hasPasswordProvider: boolean;
}

export function DangerZone({ hasPasswordProvider }: DangerZoneProps) {
  const { authClient } = useAuthClient();
  const t = useTranslations();
  const reportError = useReportError();
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
      reportError(err);
      setDeleting(false);
    }
  }

  return (
    <div>
      {!confirming ? (
        <EditableSettingsItem
          label={t('dangerZone.title')}
          value={<span className="text-destructive">{t('dangerZone.deleteAccount')}</span>}
          onEdit={() => setConfirming(true)}
          editLabel={t('dangerZone.deleteAccount')}
          pressable
        />
      ) : (
        <form onSubmit={handleDelete} className="space-y-3 border-b border-border py-3">
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
