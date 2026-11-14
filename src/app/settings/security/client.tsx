'use client';

import { useEffect, useState } from 'react';
import { PasswordSection } from '@/components/auth/settings/password-section';
import { PasskeyList } from '@/components/auth/passkey-list';
import { PasskeyCreateDialog } from '@/components/auth/passkey-create-dialog';
import { DangerZone } from '@/components/auth/settings/danger-zone';
import { useReportError } from '@/components/settings/error-context';
import { useReportLoading } from '@/components/settings/loading-context';
import { useSettingsUser } from '@/components/settings/user-context';
import { getSecuritySettings, type SecuritySettings } from '@/lib/api/security';
import { useAuthClient } from '@/lib/auth/client';

/**
 * The security settings page, composed of editable settings items —
 * the password item, the passkey items, and the danger zone item.
 * Loading is reported to the settings shell, which presents it as
 * the spinner next to the header title.
 */
export function SecurityClient() {
  const authClientHandle = useAuthClient();
  const reportError = useReportError();
  const { user } = useSettingsUser();
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  useReportLoading('security', settings === null);

  function refresh() {
    getSecuritySettings(authClientHandle)
      .then(setSettings)
      .catch((err) => reportError(err));
  }

  useEffect(() => {
    refresh();
  }, []);

  const hasPasswordProvider = settings?.hasPassword ?? false;

  return (
    <div>
      <PasswordSection hasPasswordProvider={hasPasswordProvider} loading={settings === null} onPasswordSet={refresh} />
      <PasskeyList
        passkeys={settings?.passkeys ?? null}
        onChanged={refresh}
        createAction={user.email ? <PasskeyCreateDialog onSuccess={refresh} /> : undefined}
      />
      <DangerZone hasPasswordProvider={hasPasswordProvider} />
    </div>
  );
}
