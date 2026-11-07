'use client';

import { createContext, useContext } from 'react';
import type { AccountSummary } from '@/lib/api/accounts';

interface SettingsMenuContextValue {
  appUrl: string;
  accounts: AccountSummary[];
  onAccountsMenuOpen: () => void;
  onSignOut: () => void | Promise<void>;
  onSwitchAccount: (uid: string) => void | Promise<void>;
  onAddAccount: () => void;
  onRemoveAccount: (uid: string) => void | Promise<void>;
}

export const SettingsMenuContext = createContext<SettingsMenuContextValue | null>(null);

export function useSettingsMenu(): SettingsMenuContextValue {
  const ctx = useContext(SettingsMenuContext);
  if (!ctx) throw new Error('useSettingsMenu must be used within SettingsLayout');
  return ctx;
}
