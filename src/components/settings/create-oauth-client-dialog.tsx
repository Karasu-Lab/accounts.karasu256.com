'use client';

import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Checkbox,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  R2Image,
} from '@karasu-lab/ui';
import { createOAuthClient, updateOAuthClient, type OAuthClientCreated, type OAuthClientType, type PermissionSection } from '@/lib/api/developer';
import { saveOAuthClientInfo } from '@/lib/actions/developer';
import { useAuthClient } from '@/lib/auth/client';

interface CreateOAuthClientDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  sections: PermissionSection[];
  onCreated: (_client: OAuthClientCreated) => void;
  onUploadIcon: (_clientId: string, _file: File) => Promise<string>;
}

export function CreateOAuthClientDialog({ open, onOpenChange, sections, onCreated, onUploadIcon }: CreateOAuthClientDialogProps) {
  const auth = useAuthClient();
  const t = useTranslations();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientType, setClientType] = useState<OAuthClientType>('web');
  const [redirectUrisText, setRedirectUrisText] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scopes, setScopes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<OAuthClientCreated | null>(null);
  const [copied, setCopied] = useState(false);

  function parseUris(text: string): string[] {
    return text
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);
  }

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

  function handleClose() {
    onOpenChange(false);
    setName('');
    setDescription('');
    setClientType('web');
    setRedirectUrisText('');
    setIconFile(null);
    setIconPreview('');
    setScopes(new Set());
    setCreated(null);
    setCopied(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const uris = parseUris(redirectUrisText);
    if (clientType === 'web' && uris.length === 0) return;
    setLoading(true);
    try {
      const result = await createOAuthClient(auth, {
        client_name: name.trim(),
        redirect_uris: uris,
        scope: [...scopes].join(' '),
        type: clientType,
      });
      const iconUrl = iconFile ? await onUploadIcon(result.client_id, iconFile) : null;
      if (iconUrl) await updateOAuthClient(auth, result.client_id, { logo_uri: iconUrl });
      await saveOAuthClientInfo(result.client_id, {
        name: name.trim(),
        iconUrl: iconUrl || null,
        description: description.trim() || null,
      });
      setCreated(result);
      onCreated({ ...result, icon_url: iconUrl || null, description: description.trim() || null });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-lg w-full p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
          <DialogTitle>{t('settings.developer.createClient')}</DialogTitle>

          {!created ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t('settings.developer.dialog.icon')}</Label>
                <button
                  type="button"
                  aria-label={t('settings.developer.dialog.upload')}
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative block size-16 overflow-hidden rounded-full border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {iconPreview && <R2Image src={iconPreview} alt="" className="size-full object-cover" />}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Upload className="size-5" />
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) handleFileSelected(file);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client-name">{t('settings.developer.dialog.clientName')}</Label>
                <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client-description">{t('settings.developer.dialog.description')}</Label>
                <Input id="client-description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>{t('settings.developer.dialog.clientType')}</Label>
                <RadioGroup value={clientType} onValueChange={(value) => setClientType(value as OAuthClientType)} className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm">
                    <RadioGroupItem value="web" />
                    {t('settings.developer.dialog.clientTypeWeb')}
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <RadioGroupItem value="device" />
                    {t('settings.developer.dialog.clientTypeDevice')}
                  </label>
                </RadioGroup>
              </div>

              {clientType === 'web' && (
                <div className="space-y-1.5">
                  <Label htmlFor="callback-uris">{t('settings.developer.dialog.callbackUris')}</Label>
                  <textarea
                    id="callback-uris"
                    value={redirectUrisText}
                    onChange={(e) => setRedirectUrisText(e.target.value)}
                    rows={3}
                    placeholder="https://example.com/callback"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t('settings.developer.dialog.callbackUrisHelp')}</p>
                </div>
              )}


              {sections.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('settings.developer.dialog.permissions')}</Label>
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {sections.map((s) => (
                      <div key={s.key} className="px-3 py-2 space-y-1">
                        <p className="text-sm font-medium">{t(`permissions.sections.${s.key}.label`)}</p>
                        <div className="flex gap-4 mt-1">
                          {s.canRead && (
                            <label className="flex items-center gap-1.5 text-sm">
                              <Checkbox checked={scopes.has(`read:${s.key}`)} onCheckedChange={() => toggleScope(`read:${s.key}`)} />
                              {t('settings.developer.dialog.read')}
                            </label>
                          )}
                          {s.canWrite && (
                            <label className="flex items-center gap-1.5 text-sm">
                              <Checkbox checked={scopes.has(`write:${s.key}`)} onCheckedChange={() => toggleScope(`write:${s.key}`)} />
                              {t('settings.developer.dialog.write')}
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <DialogClose
                  render={
                    <Button type="button" variant="ghost" onClick={handleClose}>
                      {t('settings.developer.dialog.cancel')}
                    </Button>
                  }
                />
                <Button type="submit" disabled={loading || !name.trim() || (clientType === 'web' && uris.length === 0)}>
                  {t('settings.developer.dialog.create')}
                </Button>
              </div>
            </form>
          ) : created.client_secret ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('settings.developer.dialog.secretNotice')}</p>
              <Input readOnly value={created.client_secret} className="font-mono text-xs" />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? '✓' : t('settings.developer.dialog.copySecret')}
                </Button>
                <Button onClick={handleClose}>{t('settings.developer.dialog.done')}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('settings.developer.dialog.clientCreated')}</p>
              <div className="flex justify-end gap-2">
                <Button onClick={handleClose}>{t('settings.developer.dialog.done')}</Button>
              </div>
            </div>
          )}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
