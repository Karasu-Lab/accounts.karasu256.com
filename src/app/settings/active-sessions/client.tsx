'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppWindow, Globe, KeyRound, Monitor, MonitorSmartphone, Smartphone, Unlink, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, ConfirmDialog, toast } from '@karasu-lab/ui';
import type { ActiveSession, SessionSource } from '@karasu-lab/types/shared';
import { loadActiveSessions, revokeActiveSession } from '@/lib/actions/sessions';
import { SettingsItemContainer, SettingsItemGroup, SettingsItemIconButton } from '@/components/settings/settings-item-container';
import { useReportError } from '@/components/settings/error-context';
import { useReportLoading } from '@/components/settings/loading-context';

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; sessions: ActiveSession[] };

const SOURCE_ICONS: Record<SessionSource, { icon: LucideIcon; iconBackgroundColor: string }> = {
  browser: { icon: Globe, iconBackgroundColor: '#2563eb' },
  desktop: { icon: Monitor, iconBackgroundColor: '#475569' },
  mobile: { icon: Smartphone, iconBackgroundColor: '#16a34a' },
  app: { icon: AppWindow, iconBackgroundColor: '#ea580c' },
  'api-key': { icon: KeyRound, iconBackgroundColor: '#9333ea' },
};

const UNKNOWN_SOURCE_ICON: { icon: LucideIcon; iconBackgroundColor: string } = {
  icon: MonitorSmartphone,
  iconBackgroundColor: '#64748b',
};

export function ActiveSessionsClient() {
  const t = useTranslations();
  const reportError = useReportError();
  const [state, setState] = useState<ListState>({ status: 'loading' });
  useReportLoading('active-sessions', state.status === 'loading');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<ActiveSession | null>(null);

  const reload = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'loaded', sessions: await loadActiveSessions() });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function confirmRevoke() {
    if (!pendingRevoke || pendingRevoke.current) return;
    setRevokingId(pendingRevoke.id);
    try {
      await revokeActiveSession(pendingRevoke.id);
      setState((prev) =>
        prev.status === 'loaded' ? { status: 'loaded', sessions: prev.sessions.filter((session) => session.id !== pendingRevoke.id) } : prev
      );
      toast.success(t('activeSessions.revoked', { name: sourceName(pendingRevoke.source) }), { autoClose: true });
    } catch (err) {
      reportError(err, 'active-sessions');
    } finally {
      setRevokingId(null);
      setPendingRevoke(null);
    }
  }

  function sourceName(source: SessionSource | null): string {
    return source ? t(`activeSessions.sources.${source}`) : t('activeSessions.sources.unknown');
  }

  function description(session: ActiveSession): string {
    const parts = [`${t('activeSessions.createdAt')}: ${new Date(session.createdAt).toLocaleString()}`];
    if (session.ipAddress) parts.push(session.ipAddress);
    if (session.current) parts.push(t('activeSessions.current'));
    return parts.join(' • ');
  }

  return (
    <div className="space-y-6">
      {state.status === 'error' ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-destructive">{t('activeSessions.loadError')}</p>
          <Button variant="ghost" size="sm" onClick={() => void reload()}>
            {t('activeSessions.retry')}
          </Button>
        </div>
      ) : state.status === 'loaded' && state.sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('activeSessions.empty')}</p>
      ) : state.status === 'loaded' ? (
        <SettingsItemGroup>
          {state.sessions.map((session) => {
            const sourceIcon = session.source ? SOURCE_ICONS[session.source] : UNKNOWN_SOURCE_ICON;
            return (
              <SettingsItemContainer
                key={session.id}
                title={sourceName(session.source)}
                description={description(session)}
                icon={sourceIcon.icon}
                iconBackgroundColor={sourceIcon.iconBackgroundColor}
                disabled={session.current}
                trailing={
                  session.current ? undefined : (
                    <SettingsItemIconButton
                      label={t('activeSessions.revoke')}
                      icon={Unlink}
                      loading={revokingId === session.id}
                      onClick={() => setPendingRevoke(session)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    />
                  )
                }
              />
            );
          })}
        </SettingsItemGroup>
      ) : null}

      <ConfirmDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevoke(null);
        }}
        title={t('activeSessions.revokeConfirm.title')}
        description={t('activeSessions.revokeConfirm.description', {
          name: pendingRevoke ? sourceName(pendingRevoke.source) : '',
        })}
        confirmLabel={t('activeSessions.revokeConfirm.confirm')}
        cancelLabel={t('activeSessions.revokeConfirm.cancel')}
        onConfirm={confirmRevoke}
      />
    </div>
  );
}
