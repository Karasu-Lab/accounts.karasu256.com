'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { parseSessionSource, sessionWithSourceSchema } from '@karasu-lab/types/shared';
import { useAuthClient } from '@/lib/auth/client';

export interface SessionSourceValue {
  providerId: string | null;
  sessionId: string | null;
}

const EMPTY_SESSION_SOURCE: SessionSourceValue = { providerId: null, sessionId: null };

const SessionSourceContext = createContext<SessionSourceValue | null>(null);

export function SessionSourceProvider({ children }: { children: ReactNode }) {
  const { authClient } = useAuthClient();
  const { data } = authClient.useSession();

  const value = useMemo<SessionSourceValue>(() => {
    const parsed = sessionWithSourceSchema.safeParse(data);
    if (!parsed.success) return EMPTY_SESSION_SOURCE;
    const sessionId = parsed.data.session.id;
    const source = parsed.data.source ? parseSessionSource(parsed.data.source, sessionId) : null;
    return { providerId: source?.providerId ?? null, sessionId };
  }, [data]);

  return <SessionSourceContext.Provider value={value}>{children}</SessionSourceContext.Provider>;
}

export function useSessionSource(): SessionSourceValue {
  const value = useContext(SessionSourceContext);
  if (!value) throw new Error('useSessionSource must be used within SessionSourceProvider');
  return value;
}
