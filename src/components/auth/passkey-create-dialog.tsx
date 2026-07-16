'use client';

import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, toast, Dialog, DialogPortal, DialogBackdrop, DialogPopup, DialogTitle } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';

interface PasskeyCreateDialogProps {
  /** Called after a passkey is successfully registered. */
  onSuccess?: () => void;
}

/**
 * A plus-icon button that opens a dialog for registering a new passkey.
 *
 * Clicking the button calls {@link e.stopPropagation} so it does not toggle
 * any parent accordion trigger.
 */
export function PasskeyCreateDialog({ onSuccess }: PasskeyCreateDialogProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.passkey.addPasskey({ name });
    if (error) {
      toast.error(error.message ?? t('passkey.error.unknown'));
    } else {
      setName('');
      setOpen(false);
      toast.success(t('passkey.registered'), { autoClose: true });
      onSuccess?.();
    }
    setLoading(false);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('passkey.register')}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <PlusIcon className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>{t('passkey.register')}</DialogTitle>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-passkey-name">{t('passkey.name')}</Label>
                <Input
                  id="dialog-passkey-name"
                  type="text"
                  placeholder={t('passkey.namePlaceholder')}
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t('dangerZone.cancel')}
                </Button>
                <Button type="submit" disabled={loading || !name.trim()}>
                  {loading ? t('passkey.registering') : t('passkey.register')}
                </Button>
              </div>
            </form>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
