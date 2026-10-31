'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';
import type { Provider } from '@/components/auth/settings/provider-section';

const ProviderSectionLazy = dynamic(() => import('@/components/auth/settings/provider-section').then((m) => m.ProviderSection), { ssr: false });

interface ProviderSectionClientProps {
  initialProviders: string[];
}

/**
 * @returns ProviderSection loaded client-side only, with OAuth providers
 * resolved via useMemo. The provider definitions are owned by the auth
 * app; this linking screen overrides the `providers` property with only
 * the social providers, so the OAuth test provider defined there is
 * never shown here.
 */
export function ProviderSectionClient({ initialProviders }: ProviderSectionClientProps) {
  const providers = useMemo<Provider[]>(
    () => [
      { id: 'google', label: 'Google', icon: faGoogle },
      { id: 'github', label: 'GitHub', icon: faGithub },
    ],
    []
  );

  return <ProviderSectionLazy providers={providers} initialProviders={initialProviders} />;
}
