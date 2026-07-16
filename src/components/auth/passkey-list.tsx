'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast, ConfirmDialog, DeleteIconButton, SettingsItem, Skeleton, AnimatedList, AnimatedListItem } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';

interface CredentialSummary {
  id: string;
  name: string;
  createdAt: number | null;
}

interface PasskeyListProps {
  /** Incrementing this value causes the list to re-fetch from the server. */
  version: number;
}

/**
 * Fetches and displays all passkey credentials for the signed-in user,
 * with a remove button for each entry.
 *
 * Re-fetches whenever {@link PasskeyListProps.version} changes, which allows
 * the parent to trigger a refresh after a new registration.
 */
export function PasskeyList({ version }: PasskeyListProps) {
  const t = useTranslations();
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [loading, setLoading] = useState(true);
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
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)))
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
    return (
      <AnimatedList className="space-y-2">
        {[0, 1].map((i) => (
          <li key={i}>
            <SettingsItem className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="size-7 rounded-md" />
            </SettingsItem>
          </li>
        ))}
      </AnimatedList>
    );
  }

  if (credentials.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('passkey.none')}</p>;
  }

  return (
    <>
      <AnimatedList className="space-y-2">
        {credentials.map((cred) => (
          <AnimatedListItem key={cred.id} removing={removingIds.has(cred.id)} onRemoved={() => handleRemoved(cred.id)}>
            <SettingsItem className="flex items-center justify-between gap-4">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium truncate">{cred.name}</p>
                {cred.createdAt !== null && <p className="text-xs text-muted-foreground">{new Date(cred.createdAt).toLocaleDateString()}</p>}
              </div>
              <DeleteIconButton
                size="icon-sm"
                loading={deletingIds.has(cred.id)}
                aria-label={t('passkey.remove')}
                onClick={() => setPendingDelete(cred)}
              />
            </SettingsItem>
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
