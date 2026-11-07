'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast, ConfirmDialog, DeleteIconButton, AnimatedList, AnimatedListItem } from '@karasu-lab/ui';
import { useAuthClient } from '@/lib/auth/client';
import { EditableSettingsItem } from '@/components/settings/editable-settings-item';
import { useReportError } from '@/components/settings/error-context';
import { useReportLoading } from '@/components/settings/loading-context';

interface CredentialSummary {
  id: string;
  name: string;
  createdAt: number | null;
}

interface PasskeyListProps {
  version: number;
  createAction?: React.ReactNode;
}

export function PasskeyList({ version, createAction }: PasskeyListProps) {
  const { authClient } = useAuthClient();
  const t = useTranslations();
  const reportError = useReportError();
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  useReportLoading('security-passkeys', loading);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<CredentialSummary | null>(null);
  const initialized = useRef(false);

  const fetchCredentials = useCallback(async () => {
    const { data } = await authClient.passkey.listUserPasskeys();
    setCredentials(
      (data ?? []).map((p) => ({ id: p.id, name: p.name ?? t('passkey.none'), createdAt: p.createdAt ? new Date(p.createdAt).getTime() : null }))
    );
  }, [t]);

  useEffect(() => {
    if (!initialized.current) {
      setLoading(true);
    }
    fetchCredentials()
      .catch((err) => reportError(err))
      .finally(() => {
        initialized.current = true;
        setLoading(false);
      });
  }, [fetchCredentials, version]);

  async function handleDelete(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    const { error } = await authClient.passkey.deletePasskey({ id });
    if (error) {
      toast.error(error.message ?? t('passkey.error.unknown'));
    } else {
      setRemovingIds((prev) => new Set(prev).add(id));
    }
    setDeletingIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  }

  function handleRemoved(id: string) {
    setCredentials((prev) => prev.filter((c) => c.id !== id));
    setRemovingIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  }

  if (loading) {
    return <EditableSettingsItem label={t('passkey.title')} value="" />;
  }

  return (
    <>
      <EditableSettingsItem
        label={t('passkey.title')}
        value={credentials.length === 0 ? t('passkey.none') : ''}
        trailing={createAction}
      />
      <AnimatedList>
        {credentials.map((cred) => (
          <AnimatedListItem key={cred.id} removing={removingIds.has(cred.id)} onRemoved={() => handleRemoved(cred.id)}>
            <EditableSettingsItem
              label={cred.name}
              value={cred.createdAt !== null ? new Date(cred.createdAt).toLocaleDateString() : ''}
              trailing={
                <DeleteIconButton
                  size="icon-sm"
                  loading={deletingIds.has(cred.id)}
                  aria-label={t('passkey.remove')}
                  onClick={() => setPendingDelete(cred)}
                />
              }
            />
          </AnimatedListItem>
        ))}
      </AnimatedList>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t('passkey.removeConfirm.title')}
        description={t('passkey.removeConfirm.description', {
          name: pendingDelete?.name ?? '',
        })}
        confirmLabel={t('passkey.remove')}
        cancelLabel={t('passkey.removeConfirm.cancel')}
        onConfirm={() => {
          if (pendingDelete) void handleDelete(pendingDelete.id);
        }}
      />
    </>
  );
}
