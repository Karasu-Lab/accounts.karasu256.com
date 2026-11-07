'use client';

import { useMemo } from 'react';
import { groupScopesBySection, type PermissionSection } from '@/lib/api/developer';
import { useDeveloperPermissions } from './developer-permissions-context';

export interface PermissionScopes {
  sections: PermissionSection[];
  baseScopes: string[];
}

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

export function usePermissionSections(): PermissionScopes {
  const { scopes, baseScopes } = useDeveloperPermissions();
  const sections = useMemo(() => groupScopesBySection(scopes), [scopes]);
  return { sections, baseScopes };
}
