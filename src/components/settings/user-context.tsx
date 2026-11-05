'use client';

import { createContext, useContext } from 'react';

export interface SettingsUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
}

interface UserContextValue {
  user: SettingsUser;
  ready: boolean;
  updateUser: (patch: Partial<SettingsUser>) => void;
}

export const UserContext = createContext<UserContextValue | null>(null);

export function useSettingsUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useSettingsUser must be used within SettingsLayout');
  return ctx;
}
