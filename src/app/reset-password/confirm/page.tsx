import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ResetPasswordConfirmForm } from '@/components/auth/reset-password-confirm-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('resetPasswordConfirm.title') };
}

interface Props {
  searchParams: Promise<{ token?: string }>;
}

/** Handles the one-time reset link from the password-reset email. */
export default async function ResetPasswordConfirmPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <ResetPasswordConfirmForm token={token ?? ''} />
    </main>
  );
}
