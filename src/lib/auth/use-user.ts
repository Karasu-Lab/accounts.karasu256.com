'use client';

import { useEffect } from 'react';
import { useAuthClient } from '@/lib/auth/client';

export function useUser() {
  const { authClient } = useAuthClient();
  const { data, isPending, refetch } = authClient.useSession();
  const userId = data?.user.id;

  useEffect(() => {
    if (userId) void refetch({ query: { disableCookieCache: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { user: data?.user ?? null, isPending, refetch };
}
