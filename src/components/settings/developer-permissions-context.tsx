'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { groupScopesBySection, type ApiKeyPermission, type PermissionSection } from '@/lib/api/developer';
import type { PermissionCatalog } from '@/lib/actions/developer';

export interface PermissionOperationGroup {
  operation: string;
  sections: PermissionSection[];
}

export function groupSectionsByOperation(sections: PermissionSection[]): PermissionOperationGroup[] {
  const groups = new Map<string, PermissionSection[]>();
  for (const section of sections) {
    const operation = section.key.split('.')[0];
    groups.set(operation, [...(groups.get(operation) ?? []), section]);
  }
  return [...groups.entries()].map(([operation, grouped]) => ({ operation, sections: grouped }));
}

export interface DeveloperPermissions {
  sections: PermissionSection[];
  baseScopes: string[];
  grantable: ApiKeyPermission[];
}

const DeveloperPermissionsContext = createContext<DeveloperPermissions | null>(null);

export function DeveloperPermissionsProvider({ catalog, children }: { catalog: PermissionCatalog; children: ReactNode }) {
  const value = useMemo<DeveloperPermissions>(
    () => ({ sections: groupScopesBySection(catalog.scopes), baseScopes: catalog.baseScopes, grantable: catalog.grantable }),
    [catalog]
  );
  return <DeveloperPermissionsContext.Provider value={value}>{children}</DeveloperPermissionsContext.Provider>;
}

export function useDeveloperPermissions(): DeveloperPermissions {
  const ctx = useContext(DeveloperPermissionsContext);
  if (!ctx) throw new Error('useDeveloperPermissions must be used within the developer settings layout');
  return ctx;
}
