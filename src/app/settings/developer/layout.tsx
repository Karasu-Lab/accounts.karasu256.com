import type { ReactNode } from 'react';
import { DeveloperPermissionsProvider } from '@/components/settings/developer-permissions-context';

export default function DeveloperLayout({ children }: { children: ReactNode }) {
  return <DeveloperPermissionsProvider>{children}</DeveloperPermissionsProvider>;
}
