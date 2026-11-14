'use client';

import { SessionSourceProvider } from '@/components/session-source-provider';
import { useRuntimeClientConfig } from '@/lib/client-config';
import { SettingsShell } from './shell';

export function SettingsLayoutClient({ children }: { children: React.ReactNode }) {
  const config = useRuntimeClientConfig();
  return (
    <SessionSourceProvider>
      <SettingsShell appUrl={config.rootAppUrl} initialUser={null}>
        {children}
      </SettingsShell>
    </SessionSourceProvider>
  );
}
