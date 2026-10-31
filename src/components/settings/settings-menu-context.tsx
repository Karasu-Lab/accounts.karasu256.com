'use client';

import { createContext, useContext } from 'react';
import type { AccountSummary } from '@/lib/api/accounts';

/**
 * Actions and data the settings shell owns (session handling, the account
 * list, the "back to app" URL) but the settings menu page at `/settings`
 * renders, since the menu replaced the sidebar that used to host them.
 */
interface SettingsMenuContextValue {
  /** URL of the root app, for the menu's "back to app" item. */
  appUrl: string;
  /** Other accounts added on this device, excluding the active one. */
  accounts: AccountSummary[];
  onSignOut: () => void | Promise<void>;
  onSwitchAccount: (uid: string) => void | Promise<void>;
  onAddAccount: () => void;
  onRemoveAccount: (uid: string) => void | Promise<void>;
}

export const SettingsMenuContext = createContext<SettingsMenuContextValue | null>(null);

/** Returns the shell-provided menu actions from the nearest SettingsLayout. */
export function useSettingsMenu(): SettingsMenuContextValue {
  const ctx = useContext(SettingsMenuContext);
  if (!ctx) throw new Error('useSettingsMenu must be used within SettingsLayout');
  return ctx;
}
