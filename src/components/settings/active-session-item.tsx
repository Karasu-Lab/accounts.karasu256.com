'use client';

import { useMemo } from 'react';
import { Globe, KeyRound, Mail, MonitorSmartphone, Unlink, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { sessionSourceParseSchema, type ActiveSession } from '@karasu-lab/types/shared';
import { SettingsItemContainer, SettingsItemIconButton } from '@/components/settings/settings-item-container';

function useProviderIcons(): Record<string, { icon: LucideIcon; iconBackgroundColor: string }> {
  return useMemo(
    () => ({
      google: { icon: Globe, iconBackgroundColor: '#4285f4' },
      github: { icon: Globe, iconBackgroundColor: '#24292f' },
      microsoft: { icon: Globe, iconBackgroundColor: '#00adef' },
      xbox: { icon: Globe, iconBackgroundColor: '#107c10' },
      credential: { icon: Mail, iconBackgroundColor: '#2563eb' },
      passkey: { icon: KeyRound, iconBackgroundColor: '#9333ea' },
    }),
    []
  );
}

export function useSessionProvider(session: ActiveSession | null) {
  const t = useTranslations();
  const providerIcons = useProviderIcons();
  const parsed = sessionSourceParseSchema.safeParse({ source: session?.source, sessionId: session?.id });
  const providerId = parsed.success ? parsed.data.providerId : null;
  const key = `activeSessions.sources.${providerId}`;
  const { icon = MonitorSmartphone, iconBackgroundColor = '#64748b' } = providerIcons[providerId ?? ''] ?? {};
  return {
    name: providerId && t.has(key) ? t(key) : t('activeSessions.sources.unknown'),
    icon,
    iconBackgroundColor,
  };
}

interface ActiveSessionItemProps {
  session: ActiveSession;
  revoking: boolean;
  onRevoke: (session: ActiveSession) => void;
}

export function ActiveSessionItem({ session, revoking, onRevoke }: ActiveSessionItemProps) {
  const t = useTranslations();
  const { name, icon, iconBackgroundColor } = useSessionProvider(session);

  const parts = [`${t('activeSessions.createdAt')}: ${new Date(session.createdAt).toLocaleString()}`];
  if (session.ipAddress) parts.push(session.ipAddress);
  if (session.current) parts.push(t('activeSessions.current'));

  return (
    <SettingsItemContainer
      title={name}
      description={parts.join(' • ')}
      icon={icon}
      iconBackgroundColor={iconBackgroundColor}
      disabled={session.current}
      trailing={
        session.current ? undefined : (
          <SettingsItemIconButton
            label={t('activeSessions.revoke')}
            icon={Unlink}
            loading={revoking}
            onClick={() => onRevoke(session)}
            className="hover:bg-destructive/10 hover:text-destructive"
          />
        )
      }
    />
  );
}
