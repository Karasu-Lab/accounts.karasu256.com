'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { AlignLeft, Globe, ImagePlus, KeyRound, Link2, LockOpen, Type } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@karasu-lab/ui';
import {
  createOAuthClient,
  oauthClientIsPublic,
  oauthClientType,
  updateOAuthClient,
  type OAuthClientCreated,
  type OAuthClientSummary,
  type OAuthClientType,
} from '@/lib/api/developer';
import { saveOAuthClientInfo } from '@/lib/actions/developer';
import { useAuthClient } from '@/lib/auth/client';
import type { SettingsDialogSpec } from './settings-dialog';
import { groupSectionsByOperation, usePermissionSections } from './use-permission-sections';

interface UseOAuthClientDialogArgs {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: OAuthClientSummary;
  onSaved: (client: OAuthClientCreated) => void;
  onUploadIcon: (clientId: string, file: File) => Promise<string>;
}

function parseUris(text: string): string[] {
  return text
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean);
}

export function useOAuthClientDialog({ open, onOpenChange, client, onSaved, onUploadIcon }: UseOAuthClientDialogArgs): {
  spec: SettingsDialogSpec;
  done?: React.ReactNode;
} {
  const auth = useAuthClient();
  const t = useTranslations();
  const { sections, baseScopes } = usePermissionSections(open);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [resource, setResource] = useState('');
  const [clientType, setClientType] = useState<OAuthClientType>('web');
  const [publicClient, setPublicClient] = useState(false);
  const [redirectUrisText, setRedirectUrisText] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState('');
  const [scopes, setScopes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<OAuthClientCreated | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(client?.client_name ?? '');
    setDescription(client?.description ?? '');
    setResource(client?.resource ?? '');
    setClientType(client ? oauthClientType(client) : 'web');
    setPublicClient(client ? oauthClientIsPublic(client) : false);
    setRedirectUrisText(client?.redirect_uris.join('\n') ?? '');
    setIconFile(null);
    setIconPreview(client?.icon_url ?? client?.logo_uri ?? '');
    setScopes(new Set(client?.scope?.split(' ').filter(Boolean) ?? []));
    setCreated(null);
    setCopied(false);
  }, [open, client]);

  function toggleScope(scope: string) {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  }

  function handleFileSelected(file: File) {
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  }

  async function handlePrimary() {
    const uris = parseUris(redirectUrisText);
    if (clientType === 'web' && uris.length === 0) return;
    setLoading(true);
    try {
      const saved = client
        ? await updateOAuthClient(auth, client.client_id, {
            client_name: name.trim(),
            ...(clientType === 'web'
              ? { redirect_uris: uris, token_endpoint_auth_method: publicClient ? 'none' : 'client_secret_basic' }
              : {}),
            scope: [...scopes].join(' '),
          })
        : await createOAuthClient(auth, {
            client_name: name.trim(),
            redirect_uris: uris,
            scope: [...scopes].join(' '),
            type: clientType,
            publicClient,
          });
      const iconUrl = iconFile ? await onUploadIcon(saved.client_id, iconFile) : (client?.icon_url ?? client?.logo_uri ?? null);
      if (iconFile && iconUrl) await updateOAuthClient(auth, saved.client_id, { logo_uri: iconUrl });
      const infoSave = await saveOAuthClientInfo(saved.client_id, {
        name: name.trim(),
        iconUrl,
        description: description.trim() || null,
        resource: resource.trim() || null,
        public: clientType === 'device' ? true : publicClient,
      });
      const result = { ...saved, client_name: name.trim(), logo_uri: iconUrl ?? undefined, icon_url: iconUrl, description: description.trim() || null, resource: resource.trim() || null, public: clientType === 'device' ? true : publicClient };
      onSaved(result);
      if (infoSave.client_secret) setCreated({ ...result, client_secret: infoSave.client_secret });
      else if (client) onOpenChange(false);
      else setCreated(result);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!created?.client_secret) return;
    await navigator.clipboard.writeText(created.client_secret);
    setCopied(true);
  }

  const uris = parseUris(redirectUrisText);
  const typeLocked = client !== undefined;

  const spec: SettingsDialogSpec = {
    title: t(client ? 'settings.developer.editClient' : 'settings.developer.createClient'),
    running: loading,
    primaryLabel: t(client ? 'settings.developer.dialog.save' : 'settings.developer.dialog.create'),
    primaryDisabled: !name.trim() || (clientType === 'web' && uris.length === 0),
    onPrimary: handlePrimary,
    cancelLabel: t('settings.developer.dialog.cancel'),
    editorSaveLabel: t('settings.developer.dialog.save'),
    editorCancelLabel: t('settings.developer.dialog.cancel'),
    sections: [
      {
        fields: [
          {
            key: 'icon',
            title: t('settings.developer.dialog.icon'),
            icon: ImagePlus,
            avatar: {
              src: iconPreview || null,
              uploading: loading,
              accept: 'image/jpeg,image/png,image/webp',
              onPick: handleFileSelected,
            },
          },
          {
            key: 'name',
            title: t('settings.developer.dialog.clientName'),
            description: name || undefined,
            icon: Type,
            edit: { value: name, autoComplete: 'organization', onSave: setName },
          },
          {
            key: 'description',
            title: t('settings.developer.dialog.description'),
            description: description || undefined,
            icon: AlignLeft,
            edit: { value: description, multiline: true, onSave: setDescription },
          },
          {
            key: 'clientType',
            title: t('settings.developer.dialog.clientType'),
            icon: Globe,
            disabled: typeLocked,
            radio: {
              options: [
                { value: 'web', label: t('settings.developer.dialog.clientTypeWeb') },
                { value: 'device', label: t('settings.developer.dialog.clientTypeDevice') },
              ],
              value: clientType,
              onValueChange: (value) => setClientType(value as OAuthClientType),
            },
          },
          ...(clientType === 'web'
            ? [
                {
                  key: 'publicClient',
                  title: t('settings.developer.dialog.publicClient'),
                  description: t('settings.developer.dialog.publicClientDescription'),
                  icon: LockOpen,
                  switch: {
                    checked: publicClient,
                    onCheckedChange: setPublicClient,
                  },
                },
                {
                  key: 'callbackUris',
                  title: t('settings.developer.dialog.callbackUris'),
                  icon: Link2,
                  content: (
                    <div className="space-y-0.5">
                      {uris.map((uri) => (
                        <p key={uri} className="font-mono text-xs break-words text-muted-foreground">
                          {uri}
                        </p>
                      ))}
                      <p className="text-xs text-muted-foreground">{t('settings.developer.dialog.callbackUrisHelp')}</p>
                    </div>
                  ),
                  edit: {
                    value: redirectUrisText,
                    multiline: true,
                    placeholder: 'https://example.com/callback',
                    onSave: setRedirectUrisText,
                  },
                },
              ]
            : []),
          {
            key: 'resource',
            title: t('settings.developer.dialog.resource'),
            description: resource || undefined,
            icon: Link2,
            edit: { value: resource, placeholder: 'https://example.com/mcp', onSave: setResource },
          },
        ],
      },
      {
        title: t('settings.developer.dialog.permissions'),
        fields: [
          ...groupSectionsByOperation(sections).map((group) => ({
            key: `permissions.${group.operation}`,
            title: t.has(`permissions.operations.${group.operation}.label`)
              ? t(`permissions.operations.${group.operation}.label`)
              : group.operation,
            icon: KeyRound,
            items: group.sections.map((s) => ({
              key: s.key,
              title: t(`permissions.sections.${s.key}.label`),
              icon: null,
              items: [
                ...(s.canRead
                  ? [
                      {
                        key: 'read',
                        title: t('settings.developer.dialog.read'),
                        checked: scopes.has(`read:${s.key}`),
                        onCheckedChange: () => toggleScope(`read:${s.key}`),
                        toggle: true,
                      },
                    ]
                  : []),
                ...(s.canWrite
                  ? [
                      {
                        key: 'write',
                        title: t('settings.developer.dialog.write'),
                        checked: scopes.has(`write:${s.key}`),
                        onCheckedChange: () => toggleScope(`write:${s.key}`),
                        toggle: true,
                      },
                    ]
                  : []),
              ],
            })),
          })),
          ...baseScopes.map((scope) => ({
            key: `scopes.${scope}`,
            title: t.has(`authorizedApps.scopes.${scope}`) ? t(`authorizedApps.scopes.${scope}`) : scope,
            icon: KeyRound,
            switch: {
              checked: scopes.has(scope),
              onCheckedChange: () => toggleScope(scope),
            },
          })),
        ],
      },
    ],
  };

  const done =
    created === null
      ? undefined
      : created.client_secret
        ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('settings.developer.dialog.secretNotice')}</p>
            <Input readOnly value={created.client_secret} className="font-mono text-xs" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleCopy}>
                {copied ? '✓' : t('settings.developer.dialog.copySecret')}
              </Button>
              <Button onClick={() => onOpenChange(false)}>{t('settings.developer.dialog.done')}</Button>
            </div>
          </div>
        )
        : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('settings.developer.dialog.clientCreated')}</p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => onOpenChange(false)}>{t('settings.developer.dialog.done')}</Button>
            </div>
          </div>
        );

  return { spec, done };
}
