'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from '@karasu-lab/ui';
import { authClient } from '@/lib/auth/client';
import { useSettingsUser } from '@/components/settings/user-context';
import { EditableSettingsItem } from '@/components/settings/editable-settings-item';
import { EditValueDialog } from '@/components/settings/edit-value-dialog';
import { ProfileIcon, type ProfileIconHandle } from './profile-icon';

/**
 * The profile settings page, rebuilt from {@link EditableSettingsItem}s:
 * the icon item and the display name item — the same items as before.
 *
 * There is no page-level save button and no saved/unsaved judgment.
 * Pressing the display name item opens the generic
 * {@link EditValueDialog}, where the user edits the value and chooses
 * Save or Cancel there. The icon item's edit button opens the icon file
 * picker (the avatar itself keeps its click and context-menu behaviour).
 *
 * Nothing is replaced with a skeleton while loading: the items render
 * immediately and are only disabled until {@link useSettingsUser}'s
 * `ready` flag flips true, which happens once the better-auth session
 * resolves.
 */
export function ProfileSection() {
  const t = useTranslations();
  const { user, ready, updateUser } = useSettingsUser();
  const profileIconRef = useRef<ProfileIconHandle>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);

  /**
   * Applies the display name chosen in the edit dialog. better-auth's
   * `user` row is the source of truth; the server-side
   * `syncProfileToFirebase` hook mirrors it onto Firebase. Rethrows after
   * reporting the error so the dialog stays open for a retry.
   */
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
        value={<ProfileIcon ref={profileIconRef} />}
        onEdit={() => profileIconRef.current?.openFilePicker()}
        editLabel={t('profile.changeIcon')}
        disabled={!ready}
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
