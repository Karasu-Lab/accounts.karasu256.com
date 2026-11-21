'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from '@karasu-lab/ui';
import { useRuntimeClientConfig } from '@/lib/client-config';

export function EmailVerificationBanner() {
  const t = useTranslations('emailVerification');
  const config = useRuntimeClientConfig();
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(new URL('/api/email-verification/resend', config.authApiUrl), { method: 'POST', credentials: 'include' });
      if (res.ok) toast.success(t('sent'), { autoClose: true });
      else if (res.status === 429) toast.error(t('rateLimited'));
      else toast.error(t('failed'));
    } catch {
      toast.error(t('failed'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-8 shrink-0 items-center justify-center gap-2 border-b border-border bg-muted px-4 text-xs">
      <span className="truncate text-muted-foreground">{t('banner')}</span>
      <button type="button" onClick={handleSend} disabled={sending} className="shrink-0 font-medium underline underline-offset-2 disabled:opacity-50">
        {t('send')}
      </button>
    </div>
  );
}
