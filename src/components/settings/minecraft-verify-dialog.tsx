'use client';

import { useEffect, useState } from 'react';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Dialog, DialogBackdrop, DialogPopup, DialogPortal, DialogTitle, Label, toast } from '@karasu-lab/ui';
import { useRuntimeClientConfig } from '@/lib/client-config';
import { loadMinecraftServerAddress } from '@/lib/actions/minecraft';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { LoadingButton } from '@/components/ui/loading-button';

const CODE_LENGTH = 6;

export interface MinecraftVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void | Promise<void>;
}

export function MinecraftVerifyDialog({ open, onOpenChange, onVerified }: MinecraftVerifyDialogProps) {
  const t = useTranslations('connections.minecraftVerify');
  const config = useRuntimeClientConfig();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCode('');
    loadMinecraftServerAddress()
      .then(setAddress)
      .catch(() => setAddress(null));
  }, [open]);

  async function handleCopyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success(t('addressCopied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    try {
      const url = new URL('/api/mc/verify', config.mcAuthUrl);
      url.searchParams.set('code', code);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        toast.error(t('failed'));
        return;
      }
      await onVerified();
      onOpenChange(false);
    } catch {
      toast.error(t('failed'));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && verifying) return;
        onOpenChange(next);
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>{t('title')}</DialogTitle>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">{t('description')}</p>
            {address && (
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('serverAddress')}</p>
                <div className="flex items-center justify-between gap-2 rounded-md border py-1 pl-3 pr-1">
                  <code className="truncate text-sm">{address}</code>
                  <Button type="button" size="icon" variant="ghost" aria-label={t('copyAddress')} onClick={() => void handleCopyAddress()}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="minecraft-verify-code" className="sr-only">
                {t('codeLabel')}
              </Label>
              <InputOTP
                id="minecraft-verify-code"
                value={code}
                onChange={(value) => setCode(value.toUpperCase())}
                disabled={verifying}
                maxLength={CODE_LENGTH}
                pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                containerClassName="justify-center"
                autoFocus
              >
                <InputOTPGroup>
                  {Array.from({ length: CODE_LENGTH }, (_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={verifying}>
                {t('cancel')}
              </Button>
              <LoadingButton type="submit" loading={verifying} disabled={verifying || code.length !== CODE_LENGTH}>
                {t('verify')}
              </LoadingButton>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
