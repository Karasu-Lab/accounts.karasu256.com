'use client';

import { Flag, GitBranch, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFeatureFlags } from '@karasu-lab/flags/client';
import type { ApiMeta } from '@/lib/api/api-client';
import { appFlagsSchema } from '@/lib/flags';
import { SettingsItemContainer, SettingsItemGroup } from '@/components/settings/settings-item-container';
import { SwitchSettingsItem } from '@/components/settings/switch-settings-item';

interface DebugClientProps {
  apiMeta: ApiMeta | null;
}

/** Icon background for this screen's items: the debug section's settings menu color. */
const DEBUG_ICON_BACKGROUND_COLOR = '#dc2626';

/**
 * The debug screen, rebuilt from {@link SettingsItemContainer}s: the
 * API section is one group of items titled with what each value is and
 * described with the value itself, and the feature flags section is
 * one group of {@link SwitchSettingsItem}s titled with the flag name
 * and carrying the flag's current value as their switch. No flag item
 * takes a change handler: the values are shown, not edited, here.
 *
 * Displays the live value of this app's demo feature flags, sourced
 * from Vercel Edge Config via `useFeatureFlags`, and the API host and
 * branch exactly as api.karasu256.com reports them, since it is the
 * source of truth for both. An unavailable source keeps its own
 * message in place of its group, so a failed read never renders as an
 * empty list.
 */
export function DebugClient({ apiMeta }: DebugClientProps) {
  const t = useTranslations();
  const flags = useFeatureFlags<typeof appFlagsSchema>();

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
              <SwitchSettingsItem
                key={name}
                icon={Flag}
                iconBackgroundColor={DEBUG_ICON_BACKGROUND_COLOR}
                title={name}
                checked={Boolean(value)}
              />
            ))}
          </SettingsItemGroup>
        )}
      </section>
    </div>
  );
}
