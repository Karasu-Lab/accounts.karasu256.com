import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getRootAppUrl } from '@Hashibutogarasu/utils/server';
import { DeveloperSection } from '@/components/settings/developer-section';
import { AuthBranchSection } from '@/components/settings/auth-branch-section';
import { getAuthBranch } from '@/lib/auth/branch';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('settings.developer.title') };
}

/** Developer settings page — manages OAuth clients and API keys, and outside production shows auth's database branch. */
export default async function DeveloperPage() {
  const [resourceServerUrl, authBranch] = await Promise.all([getRootAppUrl(), getAuthBranch()]);
  return (
    <div className="space-y-6">
      <DeveloperSection resourceServerUrl={resourceServerUrl} />
      {authBranch && <AuthBranchSection branch={authBranch} />}
    </div>
  );
}
