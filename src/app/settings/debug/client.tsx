'use client';

import { Flag, GitBranch, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppFlags } from '@/components/flags-client-provider';
import type { ApiMeta } from '@/lib/api/api-client';
import { SettingsItemContainer, SettingsItemGroup } from '@/components/settings/settings-item-container';
import { SwitchSettingsItem } from '@/components/settings/switch-settings-item';

interface DebugClientProps {
  apiMeta: ApiMeta | null;
}

const DEBUG_ICON_BACKGROUND_COLOR = '#dc2626';

export function DebugClient({ apiMeta }: DebugClientProps) {
  const t = useTranslations();
  const flags = useAppFlags();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t('debug.api.title')}</h2>
        {apiMeta === null ? (
          <p className="text-muted-foreground">{t('debug.api.unavailable')}</p>
        ) : (
          <SettingsItemGroup>
            <SettingsItemContainer
              icon={Globe}
              iconBackgroundColor={DEBUG_ICON_BACKGROUND_COLOR}
              title={t('debug.api.host')}
              description={apiMeta.apiUrl}
            />
            <SettingsItemContainer
              icon={GitBranch}
              iconBackgroundColor={DEBUG_ICON_BACKGROUND_COLOR}
              title={t('debug.api.branch')}
              description={apiMeta.gitBranch}
            />
          </SettingsItemGroup>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t('debug.flagsTitle')}</h2>
        {flags === null ? (
          <p className="text-muted-foreground">{t('debug.unavailable')}</p>
        ) : (
          <SettingsItemGroup>
            {Object.entries(flags).map(([name, value]) => (
              <SwitchSettingsItem key={name} icon={Flag} iconBackgroundColor={DEBUG_ICON_BACKGROUND_COLOR} title={name} checked={Boolean(value)} />
            ))}
          </SettingsItemGroup>
        )}
      </section>
    </div>
  );
}
