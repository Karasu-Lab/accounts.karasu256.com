import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getRootAppUrl } from '@Hashibutogarasu/utils/server';
import { DeveloperSection } from '@/components/settings/developer-section';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('settings.developer.title') };
}

/** Developer settings page — manages OAuth clients and API keys. */
export default async function DeveloperPage() {
  const resourceServerUrl = await getRootAppUrl();
  return (
    <div className="space-y-6">
      <DeveloperSection resourceServerUrl={resourceServerUrl} />
    </div>
  );
}
