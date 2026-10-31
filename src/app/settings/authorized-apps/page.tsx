import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthorizedAppsClient } from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('authorizedApps.title') };
}

/** Authorized apps page — lists the OAuth apps the user has approved, with revocation. */
export default function AuthorizedAppsPage() {
  return <AuthorizedAppsClient />;
}
