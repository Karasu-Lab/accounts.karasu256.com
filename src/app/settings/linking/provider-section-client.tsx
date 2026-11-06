'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { faGoogle, faGithub, faMicrosoft, faXbox } from '@fortawesome/free-brands-svg-icons';
import { faCube } from '@fortawesome/free-solid-svg-icons';
import { useFeatureFlags } from '@karasu-lab/flags-sdk/client';
import type { Provider } from '@/components/auth/settings/provider-section';
import type { ProviderProfile } from '@/lib/auth/linked-provider-profile';
import { loadLinkedProviderProfiles } from '@/lib/actions/linking';
import { appFlagsSchema } from '@/lib/flags';
import { useReportError } from '@/components/settings/error-context';
import { useReportLoading } from '@/components/settings/loading-context';

function ProviderSectionLoading() {
  useReportLoading('linking', true);
  return null;
}

const ProviderSectionLazy = dynamic(() => import('@/components/auth/settings/provider-section').then((m) => m.ProviderSection), {
  ssr: false,
  loading: () => <ProviderSectionLoading />,
});

type ProfilesState = { status: 'loading' } | { status: 'loaded'; profiles: Record<string, ProviderProfile | null> };

export function ProviderSectionClient() {
  const reportError = useReportError();
  const flags = useFeatureFlags<typeof appFlagsSchema>();
  const minecraftAuthEnabled = flags?.useMinecraftAuth ?? false;
  const [state, setState] = useState<ProfilesState>({ status: 'loading' });
  useReportLoading('linking', state.status === 'loading');
  const providers = useMemo<Provider[]>(
    () => [
      { id: 'google', label: 'Google', icon: faGoogle },
      { id: 'github', label: 'GitHub', icon: faGithub },
      { id: 'microsoft', label: 'Microsoft', icon: faMicrosoft },
      { id: 'xbox', label: 'Xbox', icon: faXbox, accountProviderId: 'xbox' },
      {
        id: 'minecraft',
        label: 'Minecraft',
        icon: faCube,
        textureAvatar: true,
        accountProviderId: 'xbox',
        disabled: !minecraftAuthEnabled,
      },
    ],
    [minecraftAuthEnabled]
  );

  useEffect(() => {
    let cancelled = false;
    loadLinkedProviderProfiles()
      .then((profiles) => {
        if (!cancelled) setState({ status: 'loaded', profiles });
      })
      .catch((err) => {
        if (cancelled) return;
        reportError(err, 'linking');
        setState({ status: 'loaded', profiles: {} });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') return null;
  return <ProviderSectionLazy providers={providers} initialProfiles={state.profiles} />;
}
