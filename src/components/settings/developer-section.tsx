'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AnimatedList, Button, ConfirmDialog, SettingsAccordion, SettingsItem, Skeleton } from '@karasu-lab/ui';
import { deleteApiKey, loadApiKeys, loadOAuthClients } from '@/lib/actions/developer';
import {
  deleteOAuthClient,
  groupScopesBySection,
  type ApiKeyCreated,
  type ApiKeySummary,
  type OAuthClientCreated,
  type OAuthClientSummary,
  type PermissionSection,
} from '@/lib/api/developer';
import { ApiKeyRow } from './api-key-row';
import { OAuthClientRow } from './oauth-client-row';
import { CreateApiKeyDialog } from './create-api-key-dialog';
import { CreateOAuthClientDialog } from './create-oauth-client-dialog';
import { EditOAuthClientDialog } from './edit-oauth-client-dialog';
import { OAuthClientInfoDialog } from './oauth-client-info-dialog';
import { OAuthClientTestDialog } from './oauth-client-test-dialog';
import { RotateSecretDialog } from './rotate-secret-dialog';

type PendingDelete = { type: 'client'; id: string; name: string } | { type: 'key'; id: string; name: string };

/**
 * Load state of one settings list. Loading, failed, and loaded (which
 * may still be empty) are distinct states so the UI can switch its
 * display explicitly instead of guessing from a shared flag.
 */
type ListState<T> = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; items: T[] };

/**
 * Developer settings section. Manages OAuth clients (backed by the
 * better-auth OAuth authorization server on the auth API) and API keys,
 * with collapsible lists and creation/edit dialogs. The OAuth clients
 * load through the `loadOAuthClients` server action, separately from
 * the API keys, and each list tracks its own loading / error / loaded
 * state so "still loading", "failed", and "loaded but empty" render
 * distinctly.
 */
export function DeveloperSection() {
  const t = useTranslations();

  const [clientsState, setClientsState] = useState<ListState<OAuthClientSummary>>({ status: 'loading' });
  const [keysState, setKeysState] = useState<ListState<ApiKeySummary>>({ status: 'loading' });
  const [sections, setSections] = useState<PermissionSection[]>([]);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<OAuthClientSummary | null>(null);
  const [infoClient, setInfoClient] = useState<OAuthClientSummary | null>(null);
  const [testingClient, setTestingClient] = useState<OAuthClientSummary | null>(null);
  const [rotatingClient, setRotatingClient] = useState<OAuthClientSummary | null>(null);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  /** OAuth clients load through the server action, independently of the API keys. */
  const reloadClients = useCallback(async () => {
    setClientsState({ status: 'loading' });
    try {
      const { clients, scopes } = await loadOAuthClients();
      setSections(groupScopesBySection(scopes));
      setClientsState({ status: 'loaded', items: clients });
    } catch {
      setClientsState({ status: 'error' });
    }
  }, []);

  const reloadKeys = useCallback(async () => {
    setKeysState({ status: 'loading' });
    try {
      const keys = await loadApiKeys();
      setKeysState({ status: 'loaded', items: keys });
    } catch {
      setKeysState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    void reloadClients();
  }, [reloadClients]);

  useEffect(() => {
    void reloadKeys();
  }, [reloadKeys]);

  function updateClients(update: (_prev: OAuthClientSummary[]) => OAuthClientSummary[]) {
    setClientsState((prev) => (prev.status === 'loaded' ? { status: 'loaded', items: update(prev.items) } : prev));
  }

  function updateKeys(update: (_prev: ApiKeySummary[]) => ApiKeySummary[]) {
    setKeysState((prev) => (prev.status === 'loaded' ? { status: 'loaded', items: update(prev.items) } : prev));
  }

  function handleClientCreated(client: OAuthClientCreated) {
    updateClients((prev) => [client, ...prev]);
  }

  function handleClientUpdated(updated: OAuthClientSummary) {
    updateClients((prev) => prev.map((c) => (c.client_id === updated.client_id ? updated : c)));
  }

  function handleKeyCreated(key: ApiKeyCreated) {
    updateKeys((prev) => [key, ...prev]);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'client') {
      await deleteOAuthClient(pendingDelete.id);
      updateClients((prev) => prev.filter((c) => c.client_id !== pendingDelete.id));
    } else {
      await deleteApiKey(pendingDelete.id);
      updateKeys((prev) => prev.filter((k) => k.id !== pendingDelete.id));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t('settings.developer.title')}</h1>

      <SettingsAccordion
        title={t('settings.developer.oauthClients')}
        action={
          <Button size="icon-sm" variant="ghost" aria-label={t('settings.developer.createClient')} onClick={() => setClientDialogOpen(true)}>
            <Plus />
          </Button>
        }
      >
        <div className="mt-2 space-y-2">
          {clientsState.status === 'loading' ? (
            <AnimatedList className="space-y-2">
              {[0, 1].map((i) => (
                <li key={i}>
                  <SettingsItem className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Skeleton className="size-8 rounded shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Skeleton className="size-8 rounded-md" />
                      <Skeleton className="size-8 rounded-md" />
                    </div>
                  </SettingsItem>
                </li>
              ))}
            </AnimatedList>
          ) : clientsState.status === 'error' ? (
            <div className="flex items-center gap-3 py-2">
              <p className="text-sm text-destructive">{t('settings.developer.loadError')}</p>
              <Button variant="ghost" size="sm" onClick={() => void reloadClients()}>
                {t('settings.developer.retry')}
              </Button>
            </div>
          ) : clientsState.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t('settings.developer.noClients')}</p>
          ) : (
            clientsState.items.map((c) => (
              <OAuthClientRow
                key={c.client_id}
                client={c}
                onSelect={setInfoClient}
                onTest={setTestingClient}
                onEdit={setEditingClient}
                onDelete={(clientId) => setPendingDelete({ type: 'client', id: clientId, name: c.client_name ?? c.client_id })}
                onRotateSecret={setRotatingClient}
              />
            ))
          )}
        </div>
      </SettingsAccordion>

      <SettingsAccordion
        title={t('settings.developer.apiKeys')}
        action={
          <Button size="icon-sm" variant="ghost" aria-label={t('settings.developer.createKey')} onClick={() => setKeyDialogOpen(true)}>
            <Plus />
          </Button>
        }
      >
        <div className="mt-2 space-y-2">
          {keysState.status === 'loading' ? (
            <AnimatedList className="space-y-2">
              {[0, 1].map((i) => (
                <li key={i}>
                  <SettingsItem className="flex items-center justify-between gap-4">
                    <div className="min-w-0 space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="size-8 rounded-md shrink-0" />
                  </SettingsItem>
                </li>
              ))}
            </AnimatedList>
          ) : keysState.status === 'error' ? (
            <div className="flex items-center gap-3 py-2">
              <p className="text-sm text-destructive">{t('settings.developer.loadError')}</p>
              <Button variant="ghost" size="sm" onClick={() => void reloadKeys()}>
                {t('settings.developer.retry')}
              </Button>
            </div>
          ) : keysState.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t('settings.developer.noKeys')}</p>
          ) : (
            keysState.items.map((k) => <ApiKeyRow key={k.id} apiKey={k} onDelete={(id) => setPendingDelete({ type: 'key', id, name: k.name ?? '' })} />)
          )}
        </div>
      </SettingsAccordion>

      <CreateOAuthClientDialog open={clientDialogOpen} onOpenChange={setClientDialogOpen} sections={sections} onCreated={handleClientCreated} />
      {infoClient && (
        <OAuthClientInfoDialog
          open={infoClient !== null}
          onOpenChange={(open) => {
            if (!open) setInfoClient(null);
          }}
          client={infoClient}
        />
      )}
      {testingClient && (
        <OAuthClientTestDialog
          open={testingClient !== null}
          onOpenChange={(open) => {
            if (!open) setTestingClient(null);
          }}
          client={testingClient}
        />
      )}
      {editingClient && (
        <EditOAuthClientDialog
          open={editingClient !== null}
          onOpenChange={(open) => {
            if (!open) setEditingClient(null);
          }}
          client={editingClient}
          sections={sections}
          onUpdated={handleClientUpdated}
        />
      )}
      <CreateApiKeyDialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen} onCreated={handleKeyCreated} />
      {rotatingClient && (
        <RotateSecretDialog
          open={rotatingClient !== null}
          onOpenChange={(open) => {
            if (!open) setRotatingClient(null);
          }}
          clientId={rotatingClient.client_id}
          clientName={rotatingClient.client_name ?? rotatingClient.client_id}
        />
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t('settings.developer.deleteConfirm.title')}
        description={t('settings.developer.deleteConfirm.description', {
          name: pendingDelete?.name ?? '',
        })}
        confirmLabel={t('settings.developer.delete')}
        cancelLabel={t('settings.developer.deleteConfirm.cancel')}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
