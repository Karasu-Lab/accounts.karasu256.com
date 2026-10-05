'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Checkbox, Dialog, DialogBackdrop, DialogClose, DialogPopup, DialogPortal, DialogTitle, Input, Label } from '@Hashibutogarasu/ui';
import { createApiKey, listGrantablePermissions, type ApiKeyCreated, type ApiKeyPermission } from '@/lib/api/developer';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onCreated: (_key: ApiKeyCreated) => void;
}

/** Groups grantable permissions by the resource they apply to, preserving their order. */
function groupByResource(permissions: ApiKeyPermission[]): [string, ApiKeyPermission[]][] {
  const groups = new Map<string, ApiKeyPermission[]>();
  for (const permission of permissions) {
    groups.set(permission.resource, [...(groups.get(permission.resource) ?? []), permission]);
  }
  return [...groups.entries()];
}

/**
 * Dialog for creating a new API key with the permissions it is granted. Shows
 * the raw key once after creation and never again.
 */
export function CreateApiKeyDialog({ open, onOpenChange, onCreated }: CreateApiKeyDialogProps) {
  const t = useTranslations();
  const [name, setName] = useState('');
  const [grantable, setGrantable] = useState<ApiKeyPermission[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) listGrantablePermissions().then(setGrantable);
  }, [open]);

  function handleClose() {
    onOpenChange(false);
    setName('');
    setSelected(new Set());
    setCreatedKey(null);
    setCopied(false);
  }

  function togglePermission(publicId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createApiKey(name.trim(), [...selected]);
      setCreatedKey(result);
      onCreated(result);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md w-full p-6 space-y-4">
          <DialogTitle>{t('settings.developer.createKey')}</DialogTitle>

          {!createdKey ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">{t('settings.developer.dialog.keyName')}</Label>
                <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              {grantable.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('settings.developer.dialog.permissions')}</Label>
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {groupByResource(grantable).map(([resource, permissions]) => (
                      <div key={resource} className="px-3 py-2 space-y-1">
                        <p className="text-sm font-medium">{t(`permissions.sections.${resource}.label`)}</p>
                        <div className="flex gap-4 mt-1">
                          {permissions.map((permission) => (
                            <label key={permission.publicId} className="flex items-center gap-1.5 text-sm">
                              <Checkbox checked={selected.has(permission.publicId)} onCheckedChange={() => togglePermission(permission.publicId)} />
                              {t(`settings.developer.dialog.${permission.action}`)}
                            </label>
                          ))}
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
                <Button type="submit" disabled={loading || !name.trim()}>
                  {t('settings.developer.dialog.create')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('settings.developer.dialog.keyNotice')}</p>
              <Input readOnly value={createdKey.key} className="font-mono text-xs" />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? '✓' : t('settings.developer.dialog.copyKey')}
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
