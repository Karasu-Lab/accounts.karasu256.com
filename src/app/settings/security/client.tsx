'use client';

import { useEffect, useMemo, useState } from 'react';
import { listLinkedProviders, type ProviderProfile } from '@karasu-lab/utils/client';
import { PasswordSection } from '@/components/auth/settings/password-section';
import { PasskeyList } from '@/components/auth/passkey-list';
import { PasskeyCreateDialog } from '@/components/auth/passkey-create-dialog';
import { DangerZone } from '@/components/auth/settings/danger-zone';
import { useReportLoading } from '@/components/settings/loading-context';
import { useSettingsUser } from '@/components/settings/user-context';

/**
 * The security settings page, composed of editable settings items —
 * the password item, the passkey items, and the danger zone item.
 * Loading is reported to the settings shell, which presents it as
 * the spinner next to the header title.
 */
export function SecurityClient() {
  const { user } = useSettingsUser();
  const [passkeyVersion, setPasskeyVersion] = useState(0);
  const [linkedProviders, setLinkedProviders] = useState<Record<string, ProviderProfile>>({});
  const [providersLoading, setProvidersLoading] = useState(true);
  useReportLoading('security', providersLoading);

  useEffect(() => {
    listLinkedProviders()
      .then(setLinkedProviders)
      .catch(() => {})
      .finally(() => setProvidersLoading(false));
  }, []);

  const hasPasswordProvider = useMemo(() => 'credential' in linkedProviders, [linkedProviders]);

  function handlePasswordSet() {
    setLinkedProviders((prev) => ({ ...prev, credential: { name: null, email: null, avatarUrl: null } }));
  }

  return (
    <div>
      <PasswordSection hasPasswordProvider={hasPasswordProvider} onPasswordSet={handlePasswordSet} />
      <PasskeyList
        version={passkeyVersion}
        createAction={user.email ? <PasskeyCreateDialog onSuccess={() => setPasskeyVersion((v) => v + 1)} /> : undefined}
      />
      <DangerZone hasPasswordProvider={hasPasswordProvider} />
    </div>
  );
}
