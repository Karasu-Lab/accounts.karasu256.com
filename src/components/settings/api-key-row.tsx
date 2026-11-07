'use client';

import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DeleteIconButton } from '@karasu-lab/ui';
import type { ApiKeySummary } from '@/lib/api/developer';
import { SettingsItemContainer } from './settings-item-container';

interface ApiKeyRowProps {
  apiKey: ApiKeySummary;
  onDelete: (_id: string) => void;
  hasItemAbove?: boolean;
  hasItemBelow?: boolean;
}

const DEVELOPER_ICON_BACKGROUND_COLOR = '#475569';

export function ApiKeyRow({ apiKey, onDelete, hasItemAbove, hasItemBelow }: ApiKeyRowProps) {
  const t = useTranslations();

  const description = [
    `${apiKey.start}…`,
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
