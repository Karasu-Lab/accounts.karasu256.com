import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('resetPassword.title') };
}

/** Password reset page — accessible without authentication. */
export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <ResetPasswordForm />
    </main>
  );
}
