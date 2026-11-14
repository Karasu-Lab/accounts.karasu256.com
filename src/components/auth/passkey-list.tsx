'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast, ConfirmDialog, DeleteIconButton, AnimatedList, AnimatedListItem } from '@karasu-lab/ui';
import { useAuthClient } from '@/lib/auth/client';
import type { SecuritySettings } from '@/lib/api/security';
import { EditableSettingsItem } from '@/components/settings/editable-settings-item';

interface CredentialSummary {
  id: string;
  name: string;
  createdAt: number | null;
}

interface PasskeyListProps {
  passkeys: SecuritySettings['passkeys'] | null;
  onChanged: () => void;
  createAction?: React.ReactNode;
}

export function PasskeyList({ passkeys, onChanged, createAction }: PasskeyListProps) {
  const { authClient } = useAuthClient();
  const t = useTranslations();
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<CredentialSummary | null>(null);

  useEffect(() => {
    if (!passkeys) return;
    setCredentials(
      passkeys.map((p) => ({ id: p.id, name: p.name ?? t('passkey.none'), createdAt: p.createdAt ? new Date(p.createdAt).getTime() : null }))
    );
  }, [passkeys, t]);

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
    onChanged();
  }

  if (!passkeys) {
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
