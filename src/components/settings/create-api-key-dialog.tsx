'use client';

import type { ApiKeyCreated } from '@/lib/api/developer';
import { SettingsDialog } from './settings-dialog';
import { useCreateApiKeyDialog } from './use-create-api-key-dialog';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (key: ApiKeyCreated) => void;
}

export function CreateApiKeyDialog({ open, onOpenChange, onCreated }: CreateApiKeyDialogProps) {
  const { spec, done } = useCreateApiKeyDialog({ open, onOpenChange, onCreated });

  return <SettingsDialog spec={spec} open={open} onOpenChange={onOpenChange} done={done} />;
}
