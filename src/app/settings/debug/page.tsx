import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getApiMeta, type ApiMeta } from '@/lib/api/api-client';
import { DebugClient } from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('debug.title') };
}

/** An unreachable API is itself useful debug output, so the page still renders and says so. */
async function loadApiMeta(): Promise<ApiMeta | null> {
  try {
    return await getApiMeta();
  } catch {
    return null;
  }
}

export default async function DebugPage() {
  return <DebugClient apiMeta={await loadApiMeta()} />;
}
