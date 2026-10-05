'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AnimatedList, Button, ConfirmDialog, SettingsAccordion, SettingsItem, Skeleton } from '@Hashibutogarasu/ui';
import {
  deleteApiKey,
  deleteOAuthClient,
  getAvailableScopes,
  groupScopesBySection,
  listApiKeys,
  listOAuthClients,
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
import { OAuthClientTestDialog } from './oauth-client-test-dialog';
import { RotateSecretDialog } from './rotate-secret-dialog';

type PendingDelete = { type: 'client'; id: string; name: string } | { type: 'key'; id: string; name: string };

interface DeveloperSectionProps {
  resourceServerUrl: string;
}

/**
 * Developer settings section. Manages OAuth clients (backed by this app's
 * better-auth OAuth authorization server) and API keys, with collapsible
 * lists and creation/edit dialogs.
 */
export function DeveloperSection({ resourceServerUrl }: DeveloperSectionProps) {
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<OAuthClientSummary[]>([]);
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [sections, setSections] = useState<PermissionSection[]>([]);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<OAuthClientSummary | null>(null);
  const [testingClient, setTestingClient] = useState<OAuthClientSummary | null>(null);
  const [rotatingClient, setRotatingClient] = useState<OAuthClientSummary | null>(null);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  useEffect(() => {
    void Promise.all([
      listOAuthClients().then(setClients),
      listApiKeys().then(setKeys),
      getAvailableScopes().then((scopes) => setSections(groupScopesBySection(scopes))),
    ]).finally(() => setLoading(false));
  }, []);

  function handleClientCreated(client: OAuthClientCreated) {
    setClients((prev) => [client, ...prev]);
  }

  function handleClientUpdated(updated: OAuthClientSummary) {
    setClients((prev) => prev.map((c) => (c.client_id === updated.client_id ? updated : c)));
  }

  function handleKeyCreated(key: ApiKeyCreated) {
    setKeys((prev) => [key, ...prev]);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'client') {
      await deleteOAuthClient(pendingDelete.id);
      setClients((prev) => prev.filter((c) => c.client_id !== pendingDelete.id));
    } else {
      await deleteApiKey(pendingDelete.id);
      setKeys((prev) => prev.filter((k) => k.id !== pendingDelete.id));
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
          {loading ? (
            <AnimatedList className="space-y-2">
              {[0, 1].map((i) => (
                <li key={i}>
                  <SettingsItem className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Skeleton className="size-8 rounded shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-5 w-16 rounded-full" />
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
          ) : clients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t('settings.developer.noClients')}</p>
          ) : (
            clients.map((c) => (
              <OAuthClientRow
                key={c.client_id}
                client={c}
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
          {loading ? (
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
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t('settings.developer.noKeys')}</p>
          ) : (
            keys.map((k) => <ApiKeyRow key={k.id} apiKey={k} onDelete={(id) => setPendingDelete({ type: 'key', id, name: k.name ?? '' })} />)
          )}
        </div>
      </SettingsAccordion>

      <CreateOAuthClientDialog open={clientDialogOpen} onOpenChange={setClientDialogOpen} sections={sections} onCreated={handleClientCreated} />
      {testingClient && (
        <OAuthClientTestDialog
          open={testingClient !== null}
          onOpenChange={(open) => {
            if (!open) setTestingClient(null);
          }}
          client={testingClient}
          resourceServerUrl={resourceServerUrl}
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
