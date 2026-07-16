import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { OAuthErrorClient } from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('oauthError.title') };
}

/** Shown when the OAuth sign-in flow fails to authenticate the user. */
export default function OAuthErrorPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Suspense>
        <OAuthErrorClient />
      </Suspense>
    </main>
  );
}
