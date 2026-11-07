'use client';

import { KeyRound, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, DeleteIconButton } from '@karasu-lab/ui';
import type { ApiKeySummary } from '@/lib/api/developer';
import { SettingsItemContainer } from './settings-item-container';

interface ApiKeyRowProps {
  apiKey: ApiKeySummary;
  onEdit: (_key: ApiKeySummary) => void;
  onDelete: (_id: string) => void;
  hasItemAbove?: boolean;
  hasItemBelow?: boolean;
}

const DEVELOPER_ICON_BACKGROUND_COLOR = '#475569';

export function ApiKeyRow({ apiKey, onEdit, onDelete, hasItemAbove, hasItemBelow }: ApiKeyRowProps) {
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
      trailing={
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label={t('settings.developer.edit')} onClick={() => onEdit(apiKey)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <DeleteIconButton size="icon" aria-label={t('settings.developer.delete')} onClick={() => onDelete(apiKey.id)} />
        </div>
      }
    />
  );
}
