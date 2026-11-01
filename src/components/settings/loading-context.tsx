'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * The common interface through which client-side loading is managed
 * across the settings screens.
 *
 * Anything that loads on the client — a provider resolving the
 * session, a screen fetching its list — reports its loading state
 * here under its own key with {@link useReportLoading}, instead of
 * inventing its own indicator. The shell reads the aggregate with
 * {@link useIsLoading} and presents it with a spinner overlaid at
 * the center of the content area; a key whose wait carries its own
 * meaning (the sign-out) is read back with {@link useIsLoadingKey}
 * and presented with that wait's own container instead.
 * No screen shows a skeleton or its own loading placeholder for
 * reported loading.
 */
const LoadingReportContext = createContext<((key: string, loading: boolean) => void) | null>(null);
const LoadingStateContext = createContext<ReadonlySet<string>>(new Set());

/**
 * Holds the set of loading keys currently in flight. Reporting is
 * keyed so independent loads overlap correctly: the aggregate stays
 * loading until every reported key has cleared.
 */
export function LoadingProvider({ children }: { children: ReactNode }) {
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(new Set());

  const report = useCallback((key: string, loading: boolean) => {
    setPendingKeys((prev) => {
      if (prev.has(key) === loading) return prev;
      const next = new Set(prev);
      if (loading) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  return (
    <LoadingReportContext.Provider value={report}>
      <LoadingStateContext.Provider value={pendingKeys}>{children}</LoadingStateContext.Provider>
    </LoadingReportContext.Provider>
  );
}

/**
 * Reports one named unit of client-side loading for as long as
 * `loading` holds, and clears it on unmount. Outside a
 * {@link LoadingProvider} this is a no-op, so components stay usable
 * on their own.
 */
export function useReportLoading(key: string, loading: boolean) {
  const report = useContext(LoadingReportContext);
  useEffect(() => {
    report?.(key, loading);
    return () => {
      report?.(key, false);
    };
  }, [report, key, loading]);
}

/** Whether any client-side loading reported through this interface is in progress. */
export function useIsLoading(): boolean {
  return useContext(LoadingStateContext).size > 0;
}

/**
 * Whether one named unit of loading is in progress. Most loading
 * shares the shell's spinner presentation; a unit whose wait has a
 * presentation of its own — the sign-out, whose container the shell
 * overlays instead — reads its key here.
 */
export function useIsLoadingKey(key: string): boolean {
  return useContext(LoadingStateContext).has(key);
}
