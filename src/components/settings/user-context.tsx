'use client';

import { createContext, useContext } from 'react';

/** The authenticated user, shaped after better-auth's `session.user`. */
export interface SettingsUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
}

interface UserContextValue {
  user: SettingsUser;
  /** False until the better-auth session has resolved; consumers should disable interactive controls until this is true. */
  ready: boolean;
  /** Optimistically merges a patch into the current user without waiting for a session refetch. */
  updateUser: (patch: Partial<SettingsUser>) => void;
}

export const UserContext = createContext<UserContextValue | null>(null);

/** Returns the authenticated user and an updater from the nearest SettingsLayout. */
export function useSettingsUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useSettingsUser must be used within SettingsLayout');
  return ctx;
}
