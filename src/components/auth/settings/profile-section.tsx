'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { hashFormData } from '@Hashibutogarasu/utils/client';
import { useSettingsUser } from '@/components/settings/user-context';
import { Input } from '@Hashibutogarasu/ui';
import { Label } from '@Hashibutogarasu/ui';
import { LoadingButton } from '@/components/ui/loading-button';
import { ProfileIcon } from './profile-icon';

/** Local, editable form fields of {@link ProfileSection}; deliberately excludes the icon, which has no local draft state of its own. */
interface ProfileFormData {
  displayName: string;
}

/**
 * Displays the user's avatar (uploadable) and allows editing their display
 * name. Renders immediately (no loading skeleton) so the page is
 * recognizable as soon as it mounts; the text input, save button, and avatar
 * stay disabled until {@link useSettingsUser}'s `ready` flag flips true,
 * which happens once the better-auth session resolves.
 */
export function ProfileSection() {
  const t = useTranslations();
  const { user, ready, updateUser } = useSettingsUser();
  const [formData, setFormData] = useState<ProfileFormData>({ displayName: user.name ?? '' });
  /** Snapshot recorded on mount and refreshed after each successful save; discard reverts {@link formData} to this. */
  const [initialFormData, setInitialFormData] = useState<ProfileFormData>(formData);
  const [saving, setSaving] = useState(false);
  const disabled = !ready || saving;
  const isUnchanged = hashFormData(formData) === hashFormData(initialFormData);

  /**
   * better-auth's `user` row is the source of truth; the server-side
   * `syncProfileToFirebase` hook mirrors it onto Firebase.
   */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await authClient.updateUser({ name: formData.displayName });
      updateUser({ name: formData.displayName });
      setInitialFormData(formData);
      toast.success(t('profile.saved'), { autoClose: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  /** Reverts the form to its {@link initialFormData} snapshot; the icon isn't part of this form's local state, so it's left untouched. */
  function handleDiscard() {
    setFormData(initialFormData);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-muted-foreground">{t('profile.title')}</p>
      <div className="flex items-center gap-3">
        <ProfileIcon />
        <p className="text-sm text-muted-foreground break-all">{user.name ?? user.email ?? user.id}</p>
      </div>
      <form onSubmit={handleSave} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="display-name">{t('profile.displayName')}</Label>
          <Input
            id="display-name"
            value={formData.displayName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
            disabled={disabled}
            autoComplete="name"
          />
        </div>
        <div className="flex gap-2">
          <LoadingButton type="submit" variant="default" disabled={disabled || isUnchanged} loading={saving}>
            {saving ? t('profile.saving') : t('profile.save')}
          </LoadingButton>
          <LoadingButton type="button" variant="secondary" onClick={handleDiscard} disabled={disabled || isUnchanged} loading={false}>
            {t('profile.discard')}
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}
