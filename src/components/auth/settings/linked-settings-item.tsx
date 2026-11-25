'use client';

import * as React from 'react';
import type { ProviderProfile } from '@/lib/auth/provider-profile';
import { SettingsItemContainer } from '@/components/settings/settings-item-container';
import { MinecraftAvatar } from './minecraft-avatar';
import { ProviderIcon } from './provider-icon';

export interface LinkedSettingsItemProps {
  textureAvatar?: boolean;
  providerLabel: string;
  providerIconUrl: string;
  iconBackgroundColor?: string;
  profile: ProviderProfile | null;
  notLinkedDescription: string;
  disabled?: boolean;
  trailing?: React.ReactNode;
  hasItemAbove?: boolean;
  hasItemBelow?: boolean;
}

export function LinkedSettingsItem({
  textureAvatar,
  providerLabel,
  providerIconUrl,
  iconBackgroundColor,
  profile,
  notLinkedDescription,
  disabled,
  trailing,
  hasItemAbove,
  hasItemBelow,
}: LinkedSettingsItemProps) {
  const avatarUrl = profile?.avatarUrl ?? undefined;
  const showTextureAvatar = textureAvatar && avatarUrl !== undefined;

  return (
    <SettingsItemContainer
      title={profile ? (profile.name ?? profile.email ?? providerLabel) : providerLabel}
      description={profile ? ((profile.email ?? profile.accountId) || ' ') : notLinkedDescription}
      autoFitText={profile !== null}
      disabled={disabled}
      iconNode={
        showTextureAvatar ? (
          <span className="flex size-8 items-center justify-center">
            <MinecraftAvatar textureUrl={avatarUrl} />
          </span>
        ) : (
          <ProviderIcon iconUrl={providerIconUrl} className="size-4" />
        )
      }
      iconImageSrc={showTextureAvatar ? undefined : avatarUrl}
      iconBadge={avatarUrl ? <ProviderIcon iconUrl={providerIconUrl} className="size-2.5 text-foreground" /> : undefined}
      iconBackgroundColor={iconBackgroundColor}
      trailing={trailing}
      hasItemAbove={hasItemAbove}
      hasItemBelow={hasItemBelow}
      className="h-17"
    />
  );
}
