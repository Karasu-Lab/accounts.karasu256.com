'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Separator, SettingsAccordion } from '@Hashibutogarasu/ui';
import { listLinkedProviders, type ProviderProfile } from '@Hashibutogarasu/utils/client';
import { PasswordSection } from '@/components/auth/settings/password-section';
import { PasskeyList } from '@/components/auth/passkey-list';
import { PasskeyCreateDialog } from '@/components/auth/passkey-create-dialog';
import { DangerZone } from '@/components/auth/settings/danger-zone';
import { useSettingsUser } from '@/components/settings/user-context';

export function SecurityClient() {
  const t = useTranslations();
  const { user } = useSettingsUser();
  const [passkeyVersion, setPasskeyVersion] = useState(0);
  const [linkedProviders, setLinkedProviders] = useState<Record<string, ProviderProfile>>({});

  useEffect(() => {
    listLinkedProviders()
      .then(setLinkedProviders)
      .catch(() => {});
  }, []);

  const hasPasswordProvider = useMemo(() => 'credential' in linkedProviders, [linkedProviders]);

  function handlePasswordSet() {
    setLinkedProviders((prev) => ({ ...prev, credential: { name: null, email: null, avatarUrl: null } }));
  }

  return (
    <div className="space-y-6">
      <PasswordSection hasPasswordProvider={hasPasswordProvider} onPasswordSet={handlePasswordSet} />
      <Separator />
      <SettingsAccordion
        title={t('passkey.title')}
        action={user.email ? <PasskeyCreateDialog onSuccess={() => setPasskeyVersion((v) => v + 1)} /> : undefined}
      >
        <PasskeyList version={passkeyVersion} />
      </SettingsAccordion>
      <Separator />
      <DangerZone hasPasswordProvider={hasPasswordProvider} />
    </div>
  );
}
