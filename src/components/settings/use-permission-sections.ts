'use client';

import { useEffect, useState } from 'react';
import { loadOAuthClients } from '@/lib/actions/developer';
import { groupScopesBySection, type PermissionSection } from '@/lib/api/developer';

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

export function usePermissionSections(open: boolean): PermissionScopes {
  const [sections, setSections] = useState<PermissionSection[]>([]);
  const [baseScopes, setBaseScopes] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    loadOAuthClients()
      .then(({ scopes, baseScopes: loadedBaseScopes }) => {
        if (!active) return;
        setSections(groupScopesBySection(scopes));
        setBaseScopes(loadedBaseScopes);
      })
      .catch(() => {
        if (!active) return;
        setSections([]);
        setBaseScopes([]);
      });
    return () => {
      active = false;
    };
  }, [open]);

  return { sections, baseScopes };
}
