'use client';

import React, { useState } from 'react';
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
  FileUploadButton,
  Input,
  Label,
  R2Image,
  useR2Storage,
} from '@Hashibutogarasu/ui';
import { createOAuthClient, type OAuthClientCreated, type PermissionSection } from '@/lib/api/developer';

interface CreateOAuthClientDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  sections: PermissionSection[];
  onCreated: (_client: OAuthClientCreated) => void;
}

/**
 * Dialog for creating a new OAuth client. Handles icon upload to the image API,
 * scope selection, and displays the raw secret once after creation.
 * Accepts multiple redirect URIs, one per line.
 */
export function CreateOAuthClientDialog({ open, onOpenChange, sections, onCreated }: CreateOAuthClientDialogProps) {
  const t = useTranslations();
  const { uploading, upload } = useR2Storage();

  const [name, setName] = useState('');
  const [redirectUrisText, setRedirectUrisText] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [iconPreview, setIconPreview] = useState('');
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

  async function handleFileSelected(file: File) {
    const url = await upload(file);
    if (!url) return;
    setIconUrl(url);
    setIconPreview(URL.createObjectURL(file));
  }

  function handleClose() {
    onOpenChange(false);
    setName('');
    setRedirectUrisText('');
    setIconUrl('');
    setIconPreview('');
    setScopes(new Set());
    setCreated(null);
    setCopied(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const uris = parseUris(redirectUrisText);
    if (uris.length === 0) return;
    setLoading(true);
    try {
      const result = await createOAuthClient({
        client_name: name.trim(),
        redirect_uris: uris,
        logo_uri: iconUrl || undefined,
        scope: [...scopes].join(' '),
      });
      setCreated(result);
      onCreated(result);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!created) return;
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
                <Label htmlFor="client-name">{t('settings.developer.dialog.clientName')}</Label>
                <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

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

              <div className="space-y-1.5">
                <Label>{t('settings.developer.dialog.icon')}</Label>
                <div className="flex items-center gap-3">
                  {iconPreview && <R2Image src={iconPreview} alt="" className="size-10 rounded object-cover border border-border" />}
                  <FileUploadButton
                    label={t('settings.developer.dialog.upload')}
                    loadingLabel={t('settings.developer.dialog.uploading')}
                    loading={uploading}
                    accept="image/jpeg,image/png,image/webp"
                    onFileSelected={handleFileSelected}
                  />
                </div>
              </div>

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
                <Button type="submit" disabled={loading || !name.trim() || uris.length === 0}>
                  {t('settings.developer.dialog.create')}
                </Button>
              </div>
            </form>
          ) : (
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
          )}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
