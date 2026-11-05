'use client';

import type { OAuthClientCreated, OAuthClientSummary } from '@/lib/api/developer';
import { SettingsDialog } from './settings-dialog';
import { useOAuthClientDialog } from './use-oauth-client-dialog';

interface OAuthClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: OAuthClientSummary;
  onSaved: (client: OAuthClientCreated) => void;
  onUploadIcon: (clientId: string, file: File) => Promise<string>;
}

export function OAuthClientDialog({ open, onOpenChange, client, onSaved, onUploadIcon }: OAuthClientDialogProps) {
  const { spec, done } = useOAuthClientDialog({ open, onOpenChange, client, onSaved, onUploadIcon });

  return <SettingsDialog spec={spec} open={open} onOpenChange={onOpenChange} done={done} />;
}
