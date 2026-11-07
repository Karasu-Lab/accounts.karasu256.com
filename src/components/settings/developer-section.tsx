'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, ConfirmDialog } from '@karasu-lab/ui';
import { deleteApiKey, loadApiKeyDetail, loadApiKeys, loadOAuthClientInfo, loadOAuthClients } from '@/lib/actions/developer';
import {
  decodePermissionBitmask,
  deleteOAuthClient,
  type ApiKeyCreated,
  type ApiKeySummary,
  type OAuthClientCreated,
  type OAuthClientSummary,
} from '@/lib/api/developer';
import { useDeveloperPermissions } from './developer-permissions-context';
import { useReportLoading } from './loading-context';
import type { ApiKeyEditTarget } from './use-create-api-key-dialog';
import { useAuthClient } from '@/lib/auth/client';
import { uploadOAuthClientIcon } from '@/lib/avatar/oauth-client-icon-upload';
import { ApiKeyRow } from './api-key-row';
import { OAuthClientRow } from './oauth-client-row';
import { SettingsItemGroup } from './settings-item-container';
import { CreateApiKeyDialog } from './create-api-key-dialog';
import { OAuthClientDialog } from './oauth-client-dialog';
import { OAuthClientInfoDialog } from './oauth-client-info-dialog';
import { OAuthClientTestDialog } from './oauth-client-test-dialog';
import { RotateSecretDialog } from './rotate-secret-dialog';

type PendingDelete = { type: 'client'; id: string; name: string } | { type: 'key'; id: string; name: string };

type ListState<T> = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; items: T[] };

export function DeveloperSection() {
  const auth = useAuthClient();
  const t = useTranslations();
  const { scopeUniverse } = useDeveloperPermissions();

  const [clientsState, setClientsState] = useState<ListState<OAuthClientSummary>>({ status: 'loading' });
  const [keysState, setKeysState] = useState<ListState<ApiKeySummary>>({ status: 'loading' });
  useReportLoading('developer', clientsState.status === 'loading' || keysState.status === 'loading');
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<OAuthClientSummary | null>(null);
  const [infoClient, setInfoClient] = useState<OAuthClientSummary | null>(null);
  const [testingClient, setTestingClient] = useState<OAuthClientSummary | null>(null);
  const [rotatingClient, setRotatingClient] = useState<OAuthClientSummary | null>(null);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyEditTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const reloadClients = useCallback(async () => {
    setClientsState({ status: 'loading' });
    try {
      const clients = await loadOAuthClients();
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

  async function openEditClient(client: OAuthClientSummary) {
    const info = await loadOAuthClientInfo(client.client_id).catch(() => null);
    if (!info) {
      setEditingClient(client);
      return;
    }
    setEditingClient({
      ...client,
      client_name: info.name,
      icon_url: info.icon_url,
      description: info.description,
      resource: info.resource,
      public: info.public,
      scope: info.scope_bitmask ? decodePermissionBitmask(scopeUniverse, info.scope_bitmask).join(' ') : client.scope,
    });
  }

  async function openEditKey(key: ApiKeySummary) {
    const detail = await loadApiKeyDetail(key.id).catch(() => null);
    if (!detail) return;
    setEditingKey({ summary: key, permissionsBitmask: detail.permissions_bitmask });
  }

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
      await deleteOAuthClient(auth, pendingDelete.id);
      updateClients((prev) => prev.filter((c) => c.client_id !== pendingDelete.id));
    } else {
      await deleteApiKey(pendingDelete.id);
      updateKeys((prev) => prev.filter((k) => k.id !== pendingDelete.id));
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{t('settings.developer.oauthClients')}</h2>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t('settings.developer.createClient')}
            disabled={clientsState.status === 'loading'}
            onClick={() => setClientDialogOpen(true)}
          >
            <Plus />
          </Button>
        </div>
        {clientsState.status === 'error' ? (
          <div className="flex items-center gap-3 py-2">
            <p className="text-sm text-destructive">{t('settings.developer.loadError')}</p>
            <Button variant="ghost" size="sm" onClick={() => void reloadClients()}>
              {t('settings.developer.retry')}
            </Button>
          </div>
        ) : clientsState.status === 'loaded' && clientsState.items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{t('settings.developer.noClients')}</p>
        ) : clientsState.status === 'loaded' ? (
          <SettingsItemGroup>
            {clientsState.items.map((c) => (
              <OAuthClientRow
                key={c.client_id}
                client={c}
                onSelect={setInfoClient}
                onTest={setTestingClient}
                onEdit={(client) => void openEditClient(client)}
                onDelete={(clientId) => setPendingDelete({ type: 'client', id: clientId, name: c.client_name ?? c.client_id })}
                onRotateSecret={setRotatingClient}
              />
            ))}
          </SettingsItemGroup>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{t('settings.developer.apiKeys')}</h2>
          <Button size="icon-sm" variant="ghost" aria-label={t('settings.developer.createKey')} disabled={keysState.status === 'loading'} onClick={() => setKeyDialogOpen(true)}>
            <Plus />
          </Button>
        </div>
        {keysState.status === 'error' ? (
          <div className="flex items-center gap-3 py-2">
            <p className="text-sm text-destructive">{t('settings.developer.loadError')}</p>
            <Button variant="ghost" size="sm" onClick={() => void reloadKeys()}>
              {t('settings.developer.retry')}
            </Button>
          </div>
        ) : keysState.status === 'loaded' && keysState.items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{t('settings.developer.noKeys')}</p>
        ) : keysState.status === 'loaded' ? (
          <SettingsItemGroup>
            {keysState.items.map((k) => (
              <ApiKeyRow
                key={k.id}
                apiKey={k}
                onEdit={(key) => void openEditKey(key)}
                onDelete={(id) => setPendingDelete({ type: 'key', id, name: k.name ?? '' })}
              />
            ))}
          </SettingsItemGroup>
        ) : null}
      </section>

      <OAuthClientDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        onSaved={handleClientCreated}
        onUploadIcon={uploadOAuthClientIcon}
      />
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
        <OAuthClientDialog
          open={editingClient !== null}
          onOpenChange={(open) => {
            if (!open) setEditingClient(null);
          }}
          client={editingClient}
          onSaved={handleClientUpdated}
          onUploadIcon={uploadOAuthClientIcon}
        />
      )}
      <CreateApiKeyDialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen} onCreated={handleKeyCreated} />
      {editingKey && (
        <CreateApiKeyDialog
          open={editingKey !== null}
          onOpenChange={(open) => {
            if (!open) setEditingKey(null);
          }}
          onCreated={handleKeyCreated}
          apiKey={editingKey}
          onUpdated={() => void reloadKeys()}
        />
      )}
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
