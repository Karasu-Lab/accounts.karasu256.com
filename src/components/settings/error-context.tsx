'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLoadingPendingKeys } from './loading-context';

const GLOBAL_ERROR_KEY = 'global';

const ErrorReportContext = createContext<((error: unknown, key?: string) => void) | null>(null);
const ErrorClearContext = createContext<((key: string) => void) | null>(null);
const ErrorStateContext = createContext<ReadonlyMap<string, string>>(new Map());

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const pendingLoadingKeys = useLoadingPendingKeys();
  const pendingLoadingKeysRef = useRef(pendingLoadingKeys);

  useEffect(() => {
    pendingLoadingKeysRef.current = pendingLoadingKeys;
  }, [pendingLoadingKeys]);

  const report = useCallback((error: unknown, key?: string) => {
    const resolvedKey = key ?? pendingLoadingKeysRef.current.values().next().value ?? GLOBAL_ERROR_KEY;
    const message = error instanceof Error ? error.message : String(error);
    setErrors((prev) => {
      if (prev.get(resolvedKey) === message) return prev;
      const next = new Map(prev);
      next.set(resolvedKey, message);
      return next;
    });
  }, []);

  const clear = useCallback((key: string) => {
    setErrors((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  return (
    <ErrorReportContext.Provider value={report}>
      <ErrorClearContext.Provider value={clear}>
        <ErrorStateContext.Provider value={errors}>{children}</ErrorStateContext.Provider>
      </ErrorClearContext.Provider>
    </ErrorReportContext.Provider>
  );
}

export function useReportError(): (error: unknown, key?: string) => void {
  const report = useContext(ErrorReportContext);
  return useCallback((error: unknown, key?: string) => report?.(error, key), [report]);
}

export function useClearError(): (key: string) => void {
  const clear = useContext(ErrorClearContext);
  return useCallback((key: string) => clear?.(key), [clear]);
}

export function useErrors(): ReadonlyMap<string, string> {
  return useContext(ErrorStateContext);
}
