'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Dialog, DialogBackdrop, DialogClose, DialogPopup, DialogPortal, DialogTitle, Input } from '@Hashibutogarasu/ui';
import { rotateOAuthClientSecret } from '@/lib/api/developer';

interface RotateSecretDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  clientId: string;
  clientName: string;
}

/**
 * Two-phase dialog for rotating an OAuth client secret.
 * Phase 1 shows a confirmation warning; phase 2 reveals the new raw secret once.
 */
export function RotateSecretDialog({ open, onOpenChange, clientId, clientName }: RotateSecretDialogProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleClose() {
    onOpenChange(false);
    setNewSecret(null);
    setCopied(false);
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const { client_secret: secret } = await rotateOAuthClientSecret(clientId);
      setNewSecret(secret);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!newSecret) return;
    await navigator.clipboard.writeText(newSecret);
    setCopied(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md w-full p-6 space-y-4">
          <DialogTitle>{t('settings.developer.rotateSecretConfirm.title')}</DialogTitle>

          {newSecret === null ? (
            <>
              <p className="text-sm text-muted-foreground">{t('settings.developer.rotateSecretConfirm.description', { name: clientName })}</p>
              <div className="flex justify-end gap-2">
                <DialogClose
                  render={
                    <Button variant="ghost" onClick={handleClose}>
                      {t('settings.developer.rotateSecretConfirm.cancel')}
                    </Button>
                  }
                />
                <Button variant="destructive" disabled={loading} onClick={handleConfirm}>
                  {t('settings.developer.rotateSecretConfirm.confirm')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t('settings.developer.dialog.secretNotice')}</p>
              <Input readOnly value={newSecret} className="font-mono text-xs" />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? '✓' : t('settings.developer.dialog.copySecret')}
                </Button>
                <Button onClick={handleClose}>{t('settings.developer.dialog.done')}</Button>
              </div>
            </>
          )}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
