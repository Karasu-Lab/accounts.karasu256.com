'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { LoadingView, R2StorageProvider, Toaster } from '@karasu-lab/ui';
import { RuntimeClientConfigProvider, type RuntimeClientConfig } from '@/lib/client-config';
import { FlagsClientProvider } from './flags-client-provider';

let clientConfigPromise: Promise<RuntimeClientConfig> | null = null;

function loadClientConfig(): Promise<RuntimeClientConfig> {
  clientConfigPromise ??= fetch('/api/client-config').then(async (response) => {
    if (!response.ok) throw new Error(`Failed to load the client configuration: ${response.status}`);
    return (await response.json()) as RuntimeClientConfig;
  });
  return clientConfigPromise;
}

type ClientConfigState = { status: 'loading' } | { status: 'loaded'; config: RuntimeClientConfig } | { status: 'error'; message: string };

export function RootProviders({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const [state, setState] = useState<ClientConfigState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadClientConfig()
      .then((config) => {
        if (!cancelled) setState({ status: 'loaded', config });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <LoadingView message={t('Metadata.loading')} />
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <p className="text-sm text-destructive">{state.message}</p>
      </main>
    );
  }

  return (
    <RuntimeClientConfigProvider config={state.config}>
      <R2StorageProvider imageApiUrl={state.config.cdnUrl}>
        <FlagsClientProvider>
          {children}
          <Toaster />
        </FlagsClientProvider>
      </R2StorageProvider>
    </RuntimeClientConfigProvider>
  );
}
