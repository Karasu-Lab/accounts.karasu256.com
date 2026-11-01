'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { faGoogle, faGithub, faMicrosoft } from '@fortawesome/free-brands-svg-icons';
import { faCube } from '@fortawesome/free-solid-svg-icons';
import type { Provider } from '@/components/auth/settings/provider-section';
import type { ProviderProfile } from '@/lib/auth/linked-provider-profile';
import { useReportLoading } from '@/components/settings/loading-context';

/**
 * Rendered in place of the provider section while its client-side
 * bundle loads. It renders nothing itself: the wait is the container's
 * initial loading, which belongs to the common loading interface, so
 * it is reported there and the shell presents it with the shared
 * spinner. Once the section arrives this unmounts and the report
 * clears.
 */
function ProviderSectionLoading() {
  useReportLoading('linking', true);
  return null;
}

const ProviderSectionLazy = dynamic(() => import('@/components/auth/settings/provider-section').then((m) => m.ProviderSection), {
  ssr: false,
  loading: () => <ProviderSectionLoading />,
});

interface ProviderSectionClientProps {
  initialProfiles: Record<string, ProviderProfile | null>;
}

/**
 * @returns ProviderSection loaded client-side only, with OAuth providers
 * resolved via useMemo. The provider definitions are owned by the auth
 * app; this linking screen overrides the `providers` property with only
 * the social providers, so the OAuth test provider defined there is
 * never shown here.
 *
 * Only this initial loading — the container's bundle arriving — goes
 * through the loading provider. Everything after it (the link guards
 * resolving, a link or unlink in flight) is the section's own state
 * and stays there.
 */
export function ProviderSectionClient({ initialProfiles }: ProviderSectionClientProps) {
  const providers = useMemo<Provider[]>(
    () => [
      { id: 'google', label: 'Google', icon: faGoogle },
      { id: 'github', label: 'GitHub', icon: faGithub },
      { id: 'microsoft', label: 'Microsoft', icon: faMicrosoft, linkedAccountProviderIds: ['xbox'] },
      { id: 'minecraft', label: 'Minecraft', icon: faCube, textureAvatar: true, accountProviderId: 'xbox' },
    ],
    []
  );

  return <ProviderSectionLazy providers={providers} initialProfiles={initialProfiles} />;
}
