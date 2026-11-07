'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { KeyRound, Type } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@karasu-lab/ui';
import { createApiKey, updateApiKeyPermissions } from '@/lib/actions/developer';
import { decodePermissionBitmask, type ApiKeyCreated, type ApiKeyPermission, type ApiKeySummary } from '@/lib/api/developer';
import type { SettingsDialogSpec } from './settings-dialog';
import { useDeveloperPermissions } from './developer-permissions-context';

export interface ApiKeyEditTarget {
  summary: ApiKeySummary;
  permissionsBitmask: string;
}

interface UseCreateApiKeyDialogArgs {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (key: ApiKeyCreated) => void;
  apiKey?: ApiKeyEditTarget | null;
  onUpdated?: () => void;
}

interface PermissionResourceGroup {
  resource: string;
  permissions: ApiKeyPermission[];
}

interface PermissionOperationGroup {
  operation: string;
  resources: PermissionResourceGroup[];
}

function groupByOperation(permissions: ApiKeyPermission[]): PermissionOperationGroup[] {
  const operations = new Map<string, Map<string, ApiKeyPermission[]>>();
  for (const permission of permissions) {
    const operation = permission.resource.split('.')[0];
    const resources = operations.get(operation) ?? new Map<string, ApiKeyPermission[]>();
    resources.set(permission.resource, [...(resources.get(permission.resource) ?? []), permission]);
    operations.set(operation, resources);
  }
  return [...operations.entries()].map(([operation, resources]) => ({
    operation,
    resources: [...resources.entries()].map(([resource, grouped]) => ({ resource, permissions: grouped })),
  }));
}

export function useCreateApiKeyDialog({ open, onOpenChange, onCreated, apiKey, onUpdated }: UseCreateApiKeyDialogArgs): {
  spec: SettingsDialogSpec;
  done?: React.ReactNode;
} {
  const t = useTranslations();
  const { grantable } = useDeveloperPermissions();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) return;
    setName('');
    setSelected(new Set());
    setCreatedKey(null);
    setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open || !apiKey) return;
    setName(apiKey.summary.name ?? '');
    setSelected(new Set(decodePermissionBitmask(grantable.map((permission) => permission.publicId), apiKey.permissionsBitmask)));
  }, [open, apiKey, grantable]);

  function togglePermission(publicId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  async function handlePrimary() {
    if (!apiKey && !name.trim()) return;
    setLoading(true);
    try {
      if (apiKey) {
        await updateApiKeyPermissions(apiKey.summary.id, [...selected]);
        onUpdated?.();
        onOpenChange(false);
      } else {
        const result = await createApiKey(name.trim(), [...selected]);
        setCreatedKey(result);
        onCreated(result);
      }
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
    title: apiKey ? (apiKey.summary.name ?? t('settings.developer.createKey')) : t('settings.developer.createKey'),
    running: loading,
    primaryLabel: apiKey ? t('settings.developer.dialog.save') : t('settings.developer.dialog.create'),
    primaryDisabled: apiKey ? false : !name.trim(),
    onPrimary: handlePrimary,
    cancelLabel: t('settings.developer.dialog.cancel'),
    editorSaveLabel: t('settings.developer.dialog.save'),
    editorCancelLabel: t('settings.developer.dialog.cancel'),
    sections: [
      ...(apiKey
        ? []
        : [
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
          ]),
      {
        title: t('settings.developer.dialog.permissions'),
        fields: groupByOperation(grantable).map((group) => ({
          key: `permissions.${group.operation}`,
          title: t.has(`permissions.operations.${group.operation}.label`)
            ? t(`permissions.operations.${group.operation}.label`)
            : group.operation,
          icon: KeyRound,
          items: group.resources.map((resourceGroup) => ({
            key: resourceGroup.resource,
            title: t(`permissions.sections.${resourceGroup.resource}.label`),
            icon: null,
            items: resourceGroup.permissions.map((permission) => ({
              key: permission.publicId,
              title: t(`settings.developer.dialog.${permission.action}`),
              checked: selected.has(permission.publicId),
              onCheckedChange: () => togglePermission(permission.publicId),
              toggle: true,
            })),
          })),
        })),
      },
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
