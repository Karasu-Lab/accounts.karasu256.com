'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { faGoogle, faGithub, faMicrosoft, faXbox } from '@fortawesome/free-brands-svg-icons';
import { faCube } from '@fortawesome/free-solid-svg-icons';
import { toast } from '@karasu-lab/ui';
import { useAppFlags } from '@/components/flags-client-provider';
import type { Provider } from '@/components/auth/settings/provider-section';
import type { ProviderProfile } from '@/lib/auth/linked-provider-profile';
import { loadLinkedProviderProfiles } from '@/lib/actions/linking';
import { useRuntimeClientConfig } from '@/lib/client-config';

const ProviderSectionLazy = dynamic(() => import('@/components/auth/settings/provider-section').then((m) => m.ProviderSection), {
  ssr: false,
});

export function ProviderSectionClient() {
  const config = useRuntimeClientConfig();
  const flags = useAppFlags();
  const minecraftAuthEnabled = flags?.useMinecraftAuth ?? false;
  const [profiles, setProfiles] = useState<Record<string, ProviderProfile | null>>({});
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const providers = useMemo<Provider[]>(() => {
    const available: Provider[] = [];
    if (config.googleClientId) available.push({ id: 'google', label: 'Google', icon: faGoogle });
    if (config.githubClientId) available.push({ id: 'github', label: 'GitHub', icon: faGithub });
    if (config.microsoftClientId) {
      available.push(
        { id: 'microsoft', label: 'Microsoft', icon: faMicrosoft },
        { id: 'xbox', label: 'Xbox', icon: faXbox, accountProviderId: 'xbox' },
        {
          id: 'minecraft',
          label: 'Minecraft',
          icon: faCube,
          textureAvatar: true,
          accountProviderId: 'xbox',
          disabled: !minecraftAuthEnabled,
        }
      );
    }
    return available;
  }, [config, minecraftAuthEnabled]);

  useEffect(() => {
    let cancelled = false;
    loadLinkedProviderProfiles()
      .then((profiles) => {
        if (cancelled) return;
        setProfiles(profiles);
        setProfilesLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : String(err));
        setProfilesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <ProviderSectionLazy providers={providers} initialProfiles={profiles} profilesLoaded={profilesLoaded} />;
}
