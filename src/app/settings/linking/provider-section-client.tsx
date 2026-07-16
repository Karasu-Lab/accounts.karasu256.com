'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';
import type { Provider } from '@/components/auth/settings/provider-section';

const ProviderSectionLazy = dynamic(() => import('@/components/auth/settings/provider-section').then((m) => m.ProviderSection), { ssr: false });

interface ProviderSectionClientProps {
  initialProviders: string[];
}

/** @returns ProviderSection loaded client-side only, with OAuth providers resolved via useMemo. */
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
