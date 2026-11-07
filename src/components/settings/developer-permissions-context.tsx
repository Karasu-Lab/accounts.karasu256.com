'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ApiKeyPermission } from '@/lib/api/developer';
import { loadPermissionCatalog, type PermissionCatalog } from '@/lib/actions/developer';
import { useReportLoading } from './loading-context';

export interface DeveloperPermissions {
  scopes: string[];
  baseScopes: string[];
  scopeUniverse: string[];
  grantable: ApiKeyPermission[];
}

const EMPTY_CATALOG: PermissionCatalog = { scopes: [], baseScopes: [], scopeUniverse: [], grantable: [] };

const DeveloperPermissionsContext = createContext<DeveloperPermissions | null>(null);

export function DeveloperPermissionsProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<PermissionCatalog>(EMPTY_CATALOG);
  const [loading, setLoading] = useState(true);
  useReportLoading('developer-permissions', loading);

  useEffect(() => {
    let cancelled = false;
    loadPermissionCatalog()
      .then((loaded) => {
        if (!cancelled) setCatalog(loaded);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
