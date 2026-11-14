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

interface FlagsState {
  flags: Partial<AppFlags> | null;
  ready: boolean;
}

const FlagsContext = createContext<FlagsState>({ flags: null, ready: false });

async function fetchFlags(baseUrl: string, origin: string, keys: string[]): Promise<Partial<AppFlags>> {
  const entries = await Promise.all(
    keys.map(async (key) => {
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
  return appFlagsSchema.partial().parse(Object.fromEntries(entries));
}

export function FlagsClientProvider({ keys, children }: { keys: (keyof AppFlags)[]; children: ReactNode }) {
  const config = useRuntimeClientConfig();
  const [state, setState] = useState<FlagsState>({ flags: null, ready: false });
  const keysKey = keys.join(',');

  useEffect(() => {
    let cancelled = false;
    fetchFlags(config.featureFlagsApiUrl, config.featureFlagsOrigin, keysKey.split(','))
      .then((resolved) => {
        if (!cancelled) setState({ flags: resolved, ready: true });
      })
      .catch(() => {
        if (!cancelled) setState({ flags: null, ready: true });
      });
    return () => {
      cancelled = true;
    };
  }, [config.featureFlagsApiUrl, config.featureFlagsOrigin, keysKey]);

  return <FlagsContext.Provider value={state}>{children}</FlagsContext.Provider>;
}

export function useAppFlags(): Partial<AppFlags> | null {
  return useContext(FlagsContext).flags;
}

export function useAppFlagsReady(): boolean {
  return useContext(FlagsContext).ready;
}
