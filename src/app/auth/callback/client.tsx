'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LoadingView } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';

/**
 * better-auth's own OAuth callback redirects here with the session cookie
 * already set (via `nextCookies()`), so this only confirms the session
 * actually landed before continuing to the settings page.
 *
 * On failure, redirects to /oauth/error.
 */
export function OAuthCallbackClient() {
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    async function completeSignIn() {
      const { data } = await authClient.getSession();
      if (!data) {
        router.replace('/oauth/error');
        return;
      }
      router.replace('/settings');
    }

    completeSignIn().catch(() => router.replace('/oauth/error'));
  }, [router]);

  return <LoadingView message={t('oauthCallback.redirecting')} />;
}
