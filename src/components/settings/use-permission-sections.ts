'use client';

import { useEffect, useState } from 'react';
import { loadOAuthClients } from '@/lib/actions/developer';
import { groupScopesBySection, type PermissionSection } from '@/lib/api/developer';

export function usePermissionSections(open: boolean): PermissionSection[] {
  const [sections, setSections] = useState<PermissionSection[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    loadOAuthClients()
      .then(({ scopes }) => {
        if (active) setSections(groupScopesBySection(scopes));
      })
      .catch(() => {
        if (active) setSections([]);
      });
    return () => {
      active = false;
    };
  }, [open]);

  return sections;
}
