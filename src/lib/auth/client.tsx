'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createAppAuthClient } from '@karasu-lab/utils/client';
import type { ClientConfig } from '@/lib/auth/client-config';

/** The app auth client and the configuration it was built from. */
export interface AuthClientHandle extends ReturnType<typeof createAppAuthClient> {
  config: ClientConfig;
}

const AuthClientContext = createContext<AuthClientHandle | null>(null);

interface AuthClientProviderProps {
  config: ClientConfig;
  children: ReactNode;
}

/**
 * Provides the app auth client to the settings screens. The client is
 * built from the configuration the server handed down (see
 * client-config): the API base URL comes from the server's
 * environment, not from a public build-time variable.
 */
export function AuthClientProvider({ config, children }: AuthClientProviderProps) {
  const handle = useMemo<AuthClientHandle>(() => ({ ...createAppAuthClient({ baseURL: config.authApiUrl }), config }), [config]);
  return <AuthClientContext.Provider value={handle}>{children}</AuthClientContext.Provider>;
}

/** Returns the {@link AuthClientHandle} from the nearest {@link AuthClientProvider}. */
export function useAuthClient(): AuthClientHandle {
  const handle = useContext(AuthClientContext);
  if (!handle) throw new Error('useAuthClient must be used within AuthClientProvider');
  return handle;
}
