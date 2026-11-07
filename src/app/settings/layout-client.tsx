'use client';

import { AuthClientProvider } from '@/lib/auth/client';
import { useRuntimeClientConfig } from '@/lib/client-config';
import { SettingsShell } from './shell';

export function SettingsLayoutClient({ children }: { children: React.ReactNode }) {
  const config = useRuntimeClientConfig();
  return (
    <AuthClientProvider config={config}>
      <SettingsShell appUrl={config.rootAppUrl} initialUser={null}>
        {children}
      </SettingsShell>
    </AuthClientProvider>
  );
}
