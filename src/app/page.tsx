import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignInCard } from '@/components/auth/sign-in-card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('signIn.title') };
}

/** Sign-in page for unauthenticated users. */
export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <SignInCard />
    </main>
  );
}
