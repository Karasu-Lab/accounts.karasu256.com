'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LoadingView } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';

/** Clears the better-auth session, then navigates to the `next` search param URL. */
export function SignOutClient() {
  const searchParams = useSearchParams();
  const t = useTranslations();

  useEffect(() => {
    async function performSignOut() {
      try {
        await authClient.signOut();
      } finally {
        window.location.replace(searchParams.get('next') ?? '/');
      }
    }
    performSignOut();
  }, [searchParams]);

  return <LoadingView message={t('settings.signingOut')} />;
}
