'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  UserAvatar,
  toast,
} from '@karasu-lab/ui';
import { deleteUserIcon, setUserIconFromProvider, listLinkedProviders, type ProviderProfile } from '@karasu-lab/utils/client';
import { useSettingsUser } from '@/components/settings/user-context';
import { useReportError } from '@/components/settings/error-context';
import { uploadUserIcon } from '@/lib/avatar/upload-client';

export interface ProfileIconHandle {
  openFilePicker: () => void;
}

export interface ProfileIconProps {
  onBusyChange?: (busy: boolean) => void;
}

function providerLabel(providerId: string, profile: ProviderProfile): string {
  const displayName = providerId.charAt(0).toUpperCase() + providerId.slice(1);
  return profile.name ? `${profile.name} (${displayName})` : displayName;
}

export const ProfileIcon = forwardRef<ProfileIconHandle, ProfileIconProps>(function ProfileIcon({ onBusyChange }, ref) {
  const t = useTranslations();
  const reportError = useReportError();
  const { user, ready, updateUser } = useSettingsUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [providers, setProviders] = useState<Record<string, ProviderProfile>>({});
  const [busy, setBusy] = useState(false);
  const providerEntries = useMemo(() => Object.entries(providers), [providers]);
  const disabled = !ready || busy;

  useEffect(() => {
    if (!ready) return;
    listLinkedProviders()
      .then(setProviders)
      .catch(() => {});
  }, [ready]);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  async function applyIcon(change: () => Promise<string | null>) {
    setBusy(true);
    try {
      const photoURL = await change();
      updateUser({ image: photoURL });
      toast.success(t('profile.iconChanged'), { autoClose: true });
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await applyIcon(() => uploadUserIcon(file));
  }

  async function handleSelectProvider(providerId: string) {
    await applyIcon(() => setUserIconFromProvider(providerId));
  }

  async function handleDeleteIcon() {
    await applyIcon(async () => {
      await deleteUserIcon();
      return null;
    });
  }

  function openFilePicker() {
    if (disabled) return;
    fileInputRef.current?.click();
  }

  useImperativeHandle(ref, () => ({ openFilePicker }));

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          onClick={openFilePicker}
          aria-label={t('profile.changeIcon')}
          aria-disabled={disabled}
          className={disabled ? 'pointer-events-none opacity-50' : undefined}
        >
          <UserAvatar uid={user.id} iconUrl={user.image ?? null} size={48} className="border border-border" />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={openFilePicker}>{t('profile.uploadIcon')}</ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={providerEntries.length === 0}>{t('profile.useProviderIcon')}</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {providerEntries.map(([providerId, profile]) => (
                <ContextMenuItem key={providerId} disabled={!profile.avatarUrl} onClick={() => handleSelectProvider(providerId)}>
                  {providerLabel(providerId, profile)}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem variant="destructive" disabled={!user.image} onClick={handleDeleteIcon}>
            {t('profile.deleteIcon')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelected}
        disabled={disabled}
      />
    </>
  );
});
