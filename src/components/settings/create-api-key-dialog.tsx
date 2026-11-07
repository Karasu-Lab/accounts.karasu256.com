'use client';

import type { ApiKeyCreated } from '@/lib/api/developer';
import { SettingsDialog } from './settings-dialog';
import { useCreateApiKeyDialog, type ApiKeyEditTarget } from './use-create-api-key-dialog';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (key: ApiKeyCreated) => void;
  apiKey?: ApiKeyEditTarget | null;
  onUpdated?: () => void;
}

export function CreateApiKeyDialog({ open, onOpenChange, onCreated, apiKey, onUpdated }: CreateApiKeyDialogProps) {
  const { spec, done } = useCreateApiKeyDialog({ open, onOpenChange, onCreated, apiKey, onUpdated });

  return <SettingsDialog spec={spec} open={open} onOpenChange={onOpenChange} done={done} />;
}
