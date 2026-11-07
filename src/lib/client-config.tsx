'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ClientConfig } from '@/lib/auth/client-config';

export type RuntimeClientConfig = ClientConfig;

const RuntimeClientConfigContext = createContext<RuntimeClientConfig | null>(null);

export function RuntimeClientConfigProvider({ config, children }: { config: RuntimeClientConfig; children: ReactNode }) {
  return <RuntimeClientConfigContext.Provider value={config}>{children}</RuntimeClientConfigContext.Provider>;
}

export function useRuntimeClientConfig(): RuntimeClientConfig {
  const config = useContext(RuntimeClientConfigContext);
  if (!config) throw new Error('useRuntimeClientConfig must be used within RuntimeClientConfigProvider');
  return config;
}
