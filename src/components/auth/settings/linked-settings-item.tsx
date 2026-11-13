'use client';

import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { ProviderProfile } from '@/lib/auth/provider-profile';
import { SettingsItemContainer } from '@/components/settings/settings-item-container';
import { MinecraftAvatar } from './minecraft-avatar';

export interface LinkedSettingsItemProps {
  textureAvatar?: boolean;
  providerLabel: string;
  providerIcon: IconDefinition;
  iconBackgroundColor?: string;
  profile: ProviderProfile | null;
  notLinkedDescription: string;
  disabled?: boolean;
  /** Whether the profile has been resolved; the trailing action is withheld until then. */
  resolved?: boolean;
  trailing?: React.ReactNode;
  hasItemAbove?: boolean;
  hasItemBelow?: boolean;
}

export function LinkedSettingsItem({
  textureAvatar,
  providerLabel,
  providerIcon,
  iconBackgroundColor,
  profile,
  notLinkedDescription,
  disabled,
  resolved = true,
  trailing,
  hasItemAbove,
  hasItemBelow,
}: LinkedSettingsItemProps) {
  const avatarUrl = profile?.avatarUrl ?? undefined;
  const showTextureAvatar = textureAvatar && avatarUrl !== undefined;

  return (
    <SettingsItemContainer
      title={profile ? (profile.name ?? profile.email ?? providerLabel) : providerLabel}
      description={profile ? (profile.email ?? '') : notLinkedDescription}
      autoFitText={profile !== null}
      disabled={disabled}
      iconNode={
        showTextureAvatar ? (
          <span className="flex size-8 items-center justify-center">
            <MinecraftAvatar textureUrl={avatarUrl} />
          </span>
        ) : (
          <FontAwesomeIcon icon={providerIcon} className="size-4" />
        )
      }
      iconImageSrc={showTextureAvatar ? undefined : avatarUrl}
      iconBadge={
        avatarUrl ? <FontAwesomeIcon icon={providerIcon} className="size-2.5 text-foreground" /> : undefined
      }
      iconBackgroundColor={iconBackgroundColor}
      trailing={resolved ? trailing : undefined}
      hasItemAbove={hasItemAbove}
      hasItemBelow={hasItemBelow}
    />
  );
}
