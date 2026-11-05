'use client';

import { useEffect, useState } from 'react';
import { AlignLeft, Globe, ImagePlus, KeyRound, Link2, Type } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Checkbox, Input, RadioGroup, RadioGroupItem } from '@karasu-lab/ui';
import {
  createOAuthClient,
  oauthClientType,
  updateOAuthClient,
  type OAuthClientCreated,
  type OAuthClientSummary,
  type OAuthClientType,
  type PermissionSection,
} from '@/lib/api/developer';
import { saveOAuthClientInfo } from '@/lib/actions/developer';
import { useAuthClient } from '@/lib/auth/client';
import { SettingsDialog, type SettingsDialogSpec } from './settings-dialog';

interface OAuthClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: PermissionSection[];
  client?: OAuthClientSummary;
  onSaved: (client: OAuthClientCreated) => void;
  onUploadIcon: (clientId: string, file: File) => Promise<string>;
}

const DEVELOPER_ICON_BACKGROUND_COLOR = '#475569';

function parseUris(text: string): string[] {
  return text
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean);
}

export function OAuthClientDialog({ open, onOpenChange, sections, client, onSaved, onUploadIcon }: OAuthClientDialogProps) {
  const auth = useAuthClient();
  const t = useTranslations();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientType, setClientType] = useState<OAuthClientType>('web');
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
    setClientType(client ? oauthClientType(client) : 'web');
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
            ...(clientType === 'web' ? { redirect_uris: uris } : {}),
            scope: [...scopes].join(' '),
          })
        : await createOAuthClient(auth, {
            client_name: name.trim(),
            redirect_uris: uris,
            scope: [...scopes].join(' '),
            type: clientType,
          });
      const iconUrl = iconFile ? await onUploadIcon(saved.client_id, iconFile) : (client?.icon_url ?? client?.logo_uri ?? null);
      if (iconFile && iconUrl) await updateOAuthClient(auth, saved.client_id, { logo_uri: iconUrl });
      await saveOAuthClientInfo(saved.client_id, {
        name: name.trim(),
        iconUrl,
        description: description.trim() || null,
      });
      const result = { ...saved, client_name: name.trim(), logo_uri: iconUrl ?? undefined, icon_url: iconUrl, description: description.trim() || null };
      onSaved(result);
      if (client) onOpenChange(false);
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
    fields: [
      {
        key: 'icon',
        title: t('settings.developer.dialog.icon'),
        icon: ImagePlus,
        iconBackgroundColor: DEVELOPER_ICON_BACKGROUND_COLOR,
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
        iconBackgroundColor: DEVELOPER_ICON_BACKGROUND_COLOR,
        edit: { value: name, autoComplete: 'organization', onSave: setName },
      },
      {
        key: 'description',
        title: t('settings.developer.dialog.description'),
        description: description || undefined,
        icon: AlignLeft,
        iconBackgroundColor: DEVELOPER_ICON_BACKGROUND_COLOR,
        edit: { value: description, onSave: setDescription },
      },
      {
        key: 'clientType',
        title: t('settings.developer.dialog.clientType'),
        icon: Globe,
        iconBackgroundColor: DEVELOPER_ICON_BACKGROUND_COLOR,
        disabled: typeLocked,
        trailing: (
          <RadioGroup
            value={clientType}
            onValueChange={(value) => setClientType(value as OAuthClientType)}
            disabled={typeLocked || loading}
            className="flex gap-4"
          >
            <label className="flex items-center gap-1.5 text-sm">
              <RadioGroupItem value="web" />
              {t('settings.developer.dialog.clientTypeWeb')}
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <RadioGroupItem value="device" />
              {t('settings.developer.dialog.clientTypeDevice')}
            </label>
          </RadioGroup>
        ),
      },
      ...(clientType === 'web'
        ? [
            {
              key: 'callbackUris',
              title: t('settings.developer.dialog.callbackUris'),
              icon: Link2,
              iconBackgroundColor: DEVELOPER_ICON_BACKGROUND_COLOR,
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
      ...sections.map((s) => ({
        key: `permissions.${s.key}`,
        title: t(`permissions.sections.${s.key}.label`),
        icon: KeyRound,
        iconBackgroundColor: DEVELOPER_ICON_BACKGROUND_COLOR,
        content: (
          <div className="flex gap-4">
            {s.canRead && (
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={scopes.has(`read:${s.key}`)} onCheckedChange={() => toggleScope(`read:${s.key}`)} disabled={loading} />
                {t('settings.developer.dialog.read')}
              </label>
            )}
            {s.canWrite && (
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={scopes.has(`write:${s.key}`)} onCheckedChange={() => toggleScope(`write:${s.key}`)} disabled={loading} />
                {t('settings.developer.dialog.write')}
              </label>
            )}
          </div>
        ),
      })),
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

  return (
    <SettingsDialog
      spec={spec}
      open={open}
      onOpenChange={onOpenChange}
      done={done}
    />
  );
}
