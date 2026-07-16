import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { OAuthCallbackClient } from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('authCallback.title') };
}

/** Intermediate page shown during the OAuth sign-in redirect flow. */
export default function OAuthCallbackPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <OAuthCallbackClient />
    </main>
  );
}
