'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { KeyRound, Type } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@karasu-lab/ui';
import { createApiKey, loadGrantablePermissions } from '@/lib/actions/developer';
import type { ApiKeyCreated, ApiKeyPermission } from '@/lib/api/developer';
import type { SettingsDialogSpec } from './settings-dialog';

interface UseCreateApiKeyDialogArgs {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (key: ApiKeyCreated) => void;
}

export function useCreateApiKeyDialog({ open, onOpenChange, onCreated }: UseCreateApiKeyDialogArgs): {
  spec: SettingsDialogSpec;
  done?: React.ReactNode;
} {
  const t = useTranslations();
  const [name, setName] = useState('');
  const [grantable, setGrantable] = useState<ApiKeyPermission[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      loadGrantablePermissions().then(setGrantable);
      return;
    }
    setName('');
    setSelected(new Set());
    setCreatedKey(null);
    setCopied(false);
  }, [open]);

  function togglePermission(publicId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  async function handlePrimary() {
    if (!name.trim()) return;
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

  const spec: SettingsDialogSpec = {
    title: t('settings.developer.createKey'),
    running: loading,
    primaryLabel: t('settings.developer.dialog.create'),
    primaryDisabled: !name.trim(),
    onPrimary: handlePrimary,
    cancelLabel: t('settings.developer.dialog.cancel'),
    editorSaveLabel: t('settings.developer.dialog.save'),
    editorCancelLabel: t('settings.developer.dialog.cancel'),
    sections: [
      {
        fields: [
          {
            key: 'name',
            title: t('settings.developer.dialog.keyName'),
            description: name || undefined,
            icon: Type,
            edit: { value: name, onSave: setName },
          },
        ],
      },
      ...(grantable.length > 0
        ? [
            {
              fields: [
                {
                  key: 'permissions',
                  title: t('settings.developer.dialog.permissions'),
                  icon: KeyRound,
                  items: grantable.map((permission) => ({
                    key: permission.publicId,
                    title: t(`permissions.sections.${permission.resource}.label`),
                    description: t(`settings.developer.dialog.${permission.action}`),
                    checked: selected.has(permission.publicId),
                    onCheckedChange: () => togglePermission(permission.publicId),
                  })),
                },
              ],
            },
          ]
        : []),
    ],
  };

  const done = createdKey ? (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('settings.developer.dialog.keyNotice')}</p>
      <Input readOnly value={createdKey.key} className="font-mono text-xs" />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={handleCopy}>
          {copied ? '✓' : t('settings.developer.dialog.copyKey')}
        </Button>
        <Button onClick={() => onOpenChange(false)}>{t('settings.developer.dialog.done')}</Button>
      </div>
    </div>
  ) : undefined;

  return { spec, done };
}
