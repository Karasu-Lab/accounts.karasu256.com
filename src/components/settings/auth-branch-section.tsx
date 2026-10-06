'use client';

import { useTranslations } from 'next-intl';

interface AuthBranchSectionProps {
  branch: string;
}

export function AuthBranchSection({ branch }: AuthBranchSectionProps) {
  const t = useTranslations();

  return (
    <section className="space-y-1">
      <h2 className="text-lg font-medium">{t('settings.developer.authBranch')}</h2>
      <p className="text-sm font-mono">{branch}</p>
    </section>
  );
}
