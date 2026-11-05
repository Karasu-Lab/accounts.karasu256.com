'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from '@karasu-lab/ui';
import { useAuthClient } from '@/lib/auth/client';
import { useSettingsUser } from '@/components/settings/user-context';
import { EditableSettingsItem } from '@/components/settings/editable-settings-item';
import { EditValueDialog } from '@/components/settings/edit-value-dialog';
import { ProfileIcon, type ProfileIconHandle } from './profile-icon';

export function ProfileSection() {
  const { authClient } = useAuthClient();
  const t = useTranslations();
  const { user, ready, updateUser } = useSettingsUser();
  const profileIconRef = useRef<ProfileIconHandle>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);

  async function handleSaveName(name: string) {
    try {
      await authClient.updateUser({ name });
      updateUser({ name });
      toast.success(t('profile.saved'), { autoClose: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  return (
    <div>
      <EditableSettingsItem
        label={t('profile.icon')}
        value={<ProfileIcon ref={profileIconRef} onBusyChange={setIconBusy} />}
        onEdit={() => profileIconRef.current?.openFilePicker()}
        editLabel={t('profile.changeIcon')}
        disabled={!ready}
        busy={iconBusy}
      />
      <EditableSettingsItem
        label={t('profile.displayName')}
        value={user.name ?? ''}
        onEdit={() => setNameDialogOpen(true)}
        editLabel={t('profile.editDisplayName')}
        pressable
        disabled={!ready}
      />
      <EditValueDialog
        open={nameDialogOpen}
        onOpenChange={setNameDialogOpen}
        label={t('profile.displayName')}
        value={user.name ?? ''}
        onSave={handleSaveName}
        saveLabel={t('profile.save')}
        cancelLabel={t('profile.cancel')}
        autoComplete="name"
      />
    </div>
  );
}
