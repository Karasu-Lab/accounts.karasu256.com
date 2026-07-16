import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ProfileSection } from '@/components/auth/settings/profile-section';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('profile.title') };
}

export default function ProfilePage() {
  return <ProfileSection />;
}
