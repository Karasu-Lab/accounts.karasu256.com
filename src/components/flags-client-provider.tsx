'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { appFlagsSchema, type AppFlags } from '@karasu-lab/types/shared';
import { useRuntimeClientConfig } from '@/lib/client-config';

const flagResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    value: z.boolean(),
    type: z.literal('boolean'),
  }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

const FlagsContext = createContext<AppFlags | null>(null);

async function fetchFlags(baseUrl: string, origin: string): Promise<AppFlags> {
  const entries = await Promise.all(
    Object.keys(appFlagsSchema.shape).map(async (key) => {
      const path = key.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(new URL(`/api/flags/${path}`, baseUrl), {
        headers: { Origin: origin },
        cache: 'no-store',
      });
      const body = flagResponseSchema.parse(await response.json());
      if (!body.ok) throw new Error(`Failed to evaluate flag "${key}": ${body.error}`);
      return [key, body.value] as const;
    })
  );
  return appFlagsSchema.parse(Object.fromEntries(entries));
}

export function FlagsClientProvider({ children }: { children: ReactNode }) {
  const config = useRuntimeClientConfig();
  const [flags, setFlags] = useState<AppFlags | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFlags(config.featureFlagsApiUrl, config.featureFlagsOrigin)
      .then((resolved) => {
        if (!cancelled) setFlags(resolved);
      })
      .catch(() => {
        if (!cancelled) setFlags(null);
      });
    return () => {
      cancelled = true;
    };
  }, [config.featureFlagsApiUrl, config.featureFlagsOrigin]);

  return <FlagsContext.Provider value={flags}>{children}</FlagsContext.Provider>;
}

/** Returns the app feature flags, or `null` when they could not be resolved. */
export function useAppFlags(): AppFlags | null {
  return useContext(FlagsContext);
}
