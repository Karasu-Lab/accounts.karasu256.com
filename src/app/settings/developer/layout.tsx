import type { ReactNode } from 'react';
import { loadPermissionCatalog } from '@/lib/actions/developer';
import { DeveloperPermissionsProvider } from '@/components/settings/developer-permissions-context';

export default async function DeveloperLayout({ children }: { children: ReactNode }) {
  const catalog = await loadPermissionCatalog();
  return <DeveloperPermissionsProvider catalog={catalog}>{children}</DeveloperPermissionsProvider>;
}
