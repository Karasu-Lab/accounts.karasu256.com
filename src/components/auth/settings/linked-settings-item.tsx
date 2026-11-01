'use client';

import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { ProviderProfile } from '@/lib/auth/provider-profile';
import { SettingsItemContainer } from '@/components/settings/settings-item-container';
import { MinecraftAvatar } from './minecraft-avatar';

export interface LinkedSettingsItemProps {
  /** Whether the provider's avatar URL is a raw skin texture to convert client-side, as declared by the provider definition. */
  textureAvatar?: boolean;
  /** The provider's display label (e.g. Google), shown as the title while the provider is not linked. */
  providerLabel: string;
  /** The provider's brand icon. */
  providerIcon: IconDefinition;
  /** Tile background color. */
  iconBackgroundColor?: string;
  /**
   * The linked account's profile, or `null` when the provider is not
   * linked. The linked state is exactly whether this is non-null.
   */
  profile: ProviderProfile | null;
  /** Description shown while the provider is not linked (e.g. "Not linked"). */
  notLinkedDescription: string;
  /** Right-end action (the link / unlink icon button). */
  trailing?: React.ReactNode;
  /** Forwarded from {@link SettingsItemGroup}: true when another item sits directly above this one. */
  hasItemAbove?: boolean;
  /** Forwarded from {@link SettingsItemGroup}: true when another item sits directly below this one. */
  hasItemBelow?: boolean;
}

/**
 * One provider row of the account linking page: a
 * {@link SettingsItemContainer} specialised for linked accounts.
 *
 * While the provider is not linked, the tile shows the provider's brand
 * icon and the item shows the provider label with a not-linked
 * description. Once linked, the title becomes the linked account's name
 * and the description its email address, and the tile shows the linked
 * account's avatar — with the provider's brand icon kept as a small
 * badge overlaid on the avatar's bottom-right corner, so it stays
 * visible which provider the account belongs to instead of the avatar
 * overwriting it. When a linked account has no avatar, the tile keeps
 * the provider icon at full size and no badge is needed.
 */
export function LinkedSettingsItem({
  textureAvatar,
  providerLabel,
  providerIcon,
  iconBackgroundColor,
  profile,
  notLinkedDescription,
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
      trailing={trailing}
      hasItemAbove={hasItemAbove}
      hasItemBelow={hasItemBelow}
    />
  );
}
