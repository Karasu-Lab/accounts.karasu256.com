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
 * {@link useIsLoading} and presents the single shared presentation
 * for it: a spinner at the center of the screen. No screen shows a
 * skeleton or its own loading placeholder for reported loading.
 */
const LoadingReportContext = createContext<((key: string, loading: boolean) => void) | null>(null);
const LoadingStateContext = createContext(false);

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
      <LoadingStateContext.Provider value={pendingKeys.size > 0}>{children}</LoadingStateContext.Provider>
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
  return useContext(LoadingStateContext);
}
