'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, ConfirmDialog, toast } from '@karasu-lab/ui';
import type { ActiveSession } from '@karasu-lab/types/shared';
import { loadActiveSessions, revokeActiveSession } from '@/lib/actions/sessions';
import { SettingsItemGroup } from '@/components/settings/settings-item-container';
import { ActiveSessionItem, useSessionProvider } from '@/components/settings/active-session-item';
import { useReportError } from '@/components/settings/error-context';
import { useReportLoading } from '@/components/settings/loading-context';

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; sessions: ActiveSession[] };

export function ActiveSessionsClient() {
  const t = useTranslations();
  const reportError = useReportError();
  const [state, setState] = useState<ListState>({ status: 'loading' });
  useReportLoading('active-sessions', state.status === 'loading');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<ActiveSession | null>(null);
  const pendingProvider = useSessionProvider(pendingRevoke);

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
      toast.success(t('activeSessions.revoked', { name: pendingProvider.name }), { autoClose: true });
    } catch (err) {
      reportError(err, 'active-sessions');
    } finally {
      setRevokingId(null);
      setPendingRevoke(null);
    }
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
          {state.sessions.map((session) => (
            <ActiveSessionItem key={session.id} session={session} revoking={revokingId === session.id} onRevoke={setPendingRevoke} />
          ))}
        </SettingsItemGroup>
      ) : null}

      <ConfirmDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevoke(null);
        }}
        title={t('activeSessions.revokeConfirm.title')}
        description={t('activeSessions.revokeConfirm.description', {
          name: pendingRevoke ? pendingProvider.name : '',
        })}
        confirmLabel={t('activeSessions.revokeConfirm.confirm')}
        cancelLabel={t('activeSessions.revokeConfirm.cancel')}
        onConfirm={confirmRevoke}
      />
    </div>
  );
}
