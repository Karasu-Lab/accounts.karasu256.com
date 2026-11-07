'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ApiKeyPermission } from '@/lib/api/developer';
import type { PermissionCatalog } from '@/lib/actions/developer';

export interface DeveloperPermissions {
  scopes: string[];
  baseScopes: string[];
  scopeUniverse: string[];
  grantable: ApiKeyPermission[];
}

const DeveloperPermissionsContext = createContext<DeveloperPermissions | null>(null);

export function DeveloperPermissionsProvider({ catalog, children }: { catalog: PermissionCatalog; children: ReactNode }) {
  const value = useMemo<DeveloperPermissions>(
    () => ({ scopes: catalog.scopes, baseScopes: catalog.baseScopes, scopeUniverse: catalog.scopeUniverse, grantable: catalog.grantable }),
    [catalog]
  );
  return <DeveloperPermissionsContext.Provider value={value}>{children}</DeveloperPermissionsContext.Provider>;
}

export function useDeveloperPermissions(): DeveloperPermissions {
  const ctx = useContext(DeveloperPermissionsContext);
  if (!ctx) throw new Error('useDeveloperPermissions must be used within the developer settings layout');
  return ctx;
}
