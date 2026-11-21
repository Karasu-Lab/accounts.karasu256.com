'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { faGoogle, faGithub, faMicrosoft, faXbox } from '@fortawesome/free-brands-svg-icons';
import { faCube } from '@fortawesome/free-solid-svg-icons';
import { SseClient } from '@karasu-lab/sdk/sse';
import { ProviderStreamEvent, type ProviderStreamEvents } from '@karasu-lab/types/shared';
import { toast } from '@karasu-lab/ui';
import type { Provider } from '@/components/auth/settings/provider-section';
import type { ProviderProfile } from '@/lib/auth/provider-profile';
import { useRuntimeClientConfig } from '@/lib/client-config';
import { useReportLoading } from '@/components/settings/loading-context';

const ProviderSectionLazy = dynamic(() => import('@/components/auth/settings/provider-section').then((m) => m.ProviderSection), {
  ssr: false,
});

export function ProviderSectionClient() {
  const t = useTranslations();
  const config = useRuntimeClientConfig();
  const [profiles, setProfiles] = useState<Record<string, ProviderProfile | null>>({});
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  useReportLoading('linking', !profilesLoaded);
  const providers = useMemo<Provider[]>(() => {
    const available: Provider[] = [];
    if (config.googleClientId) available.push({ id: 'google', label: 'Google', icon: faGoogle });
    if (config.githubClientId) available.push({ id: 'github', label: 'GitHub', icon: faGithub });
    if (config.microsoftClientId) {
      available.push(
        { id: 'microsoft', label: 'Microsoft', icon: faMicrosoft },
        { id: 'xbox', label: 'Xbox', icon: faXbox, accountProviderId: 'xbox' }
      );
    }
    available.push({ id: 'minecraft', label: 'Minecraft', icon: faCube, textureAvatar: true });
    return available;
  }, [config]);

  useEffect(() => {
    setProfiles({});
    setProfilesLoaded(false);
    const url = new URL('/api/users/me/providers/stream', config.authApiUrl);
    const client = new SseClient<ProviderStreamEvents>(url, {
      withCredentials: true,
      on: {
        [ProviderStreamEvent.Profile]: ({ providerId, profile }) => setProfiles((prev) => ({ ...prev, [providerId]: profile })),
      },
      onDone: () => setProfilesLoaded(true),
      onError: () => {
        toast.error(t('connections.error.unknown'));
        setProfilesLoaded(true);
      },
    });

    return () => client.close();
  }, [config.authApiUrl, t]);

  return <ProviderSectionLazy providers={providers} initialProfiles={profiles} profilesLoaded={profilesLoaded} />;
}
