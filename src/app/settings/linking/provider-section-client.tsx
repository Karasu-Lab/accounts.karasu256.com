'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { SseClient } from '@karasu-lab/sdk/sse';
import { ProviderStreamEvent, type ProviderStreamEvents } from '@karasu-lab/types/shared';
import { toast } from '@karasu-lab/ui';
import type { Provider } from '@/components/auth/settings/provider-section';
import type { OAuthProvider } from '@/lib/api/oauth-providers';
import type { ProviderProfile } from '@/lib/auth/provider-profile';
import { useRuntimeClientConfig } from '@/lib/client-config';
import { useReportLoading } from '@/components/settings/loading-context';

const ProviderSectionLazy = dynamic(() => import('@/components/auth/settings/provider-section').then((m) => m.ProviderSection), {
  ssr: false,
});

interface ProviderClient {
  providerId: string;
  clientId: string | null;
  iconPath: string;
}

type ProviderStreamEventsWithClients = ProviderStreamEvents & {
  clients: { clients: ProviderClient[] };
};

export function ProviderSectionClient({ providers: availableProviders }: { providers: OAuthProvider[] }) {
  const t = useTranslations();
  const config = useRuntimeClientConfig();
  const [clients, setClients] = useState<ProviderClient[] | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ProviderProfile | null>>({});
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  useReportLoading('linking', !profilesLoaded);
  const providers = useMemo<Provider[]>(() => {
    const toProvider = ({ id, label, iconUrl, backgroundColor, foregroundColor }: OAuthProvider): Provider => ({
      id,
      label,
      iconUrl,
      backgroundColor,
      foregroundColor,
      ...(id === 'xbox' ? { accountProviderId: id } : {}),
      ...(id === 'minecraft' ? { textureAvatar: true } : {}),
    });
    if (!clients) return availableProviders.map(toProvider);
    const catalog = new Map(availableProviders.map((provider) => [provider.id, provider]));
    return clients.flatMap((client) => {
      const entry = catalog.get(client.providerId);
      return entry ? [toProvider(entry)] : [];
    });
  }, [availableProviders, clients]);

  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    const url = new URL('/api/users/me/providers/stream', config.authApiUrl);
    const client = new SseClient<ProviderStreamEventsWithClients>(url, {
      withCredentials: true,
      on: {
        clients: ({ clients }) => setClients(clients),
        [ProviderStreamEvent.Profile]: ({ providerId, profile }) => setProfiles((prev) => ({ ...prev, [providerId]: profile })),
      },
      onDone: () => setProfilesLoaded(true),
      onError: () => {
        toast.error(tRef.current('connections.error.unknown'));
        setProfilesLoaded(true);
      },
    });

    return () => client.close();
  }, [config.authApiUrl]);

  return <ProviderSectionLazy providers={providers} initialProfiles={profiles} profilesLoaded={profilesLoaded} />;
}
