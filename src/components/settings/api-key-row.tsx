'use client';

import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DeleteIconButton } from '@karasu-lab/ui';
import type { ApiKeySummary } from '@/lib/api/developer';
import { SettingsItemContainer } from './settings-item-container';

interface ApiKeyRowProps {
  apiKey: ApiKeySummary;
  onDelete: (_id: string) => void;
  /** Forwarded from {@link SettingsItemGroup}: true when another item sits directly above this one. */
  hasItemAbove?: boolean;
  /** Forwarded from {@link SettingsItemGroup}: true when another item sits directly below this one. */
  hasItemBelow?: boolean;
}

/** Icon tile color of the developer items, matching the developer entry in the settings menu. */
const DEVELOPER_ICON_BACKGROUND_COLOR = '#475569';

/**
 * A single API key as a settings item: its name as the title, and its
 * prefix, granted permissions, creation date, and last-used date as
 * the description, with a delete button at the right end.
 */
export function ApiKeyRow({ apiKey, onDelete, hasItemAbove, hasItemBelow }: ApiKeyRowProps) {
  const t = useTranslations();

  const description = [
    `${apiKey.start}…`,
    ...apiKey.permissions.map((permission) => `${permission.resource}:${permission.action}`),
    `${t('settings.developer.created')}: ${new Date(apiKey.createdAt).toLocaleDateString()}`,
    `${t('settings.developer.lastUsed')}: ${apiKey.lastRequest ? new Date(apiKey.lastRequest).toLocaleDateString() : t('settings.developer.neverUsed')}`,
  ].join(' · ');

  return (
    <SettingsItemContainer
      title={apiKey.name ?? ''}
      description={description}
      icon={KeyRound}
      iconBackgroundColor={DEVELOPER_ICON_BACKGROUND_COLOR}
      hasItemAbove={hasItemAbove}
      hasItemBelow={hasItemBelow}
      trailing={<DeleteIconButton size="icon" aria-label={t('settings.developer.delete')} onClick={() => onDelete(apiKey.id)} />}
    />
  );
}
