import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignOutClient } from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('signOut.title') };
}

/** Sign-out page. Clears Firebase Auth state then redirects to `?next`. */
export default function SignOutPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Suspense>
        <SignOutClient />
      </Suspense>
    </main>
  );
}
