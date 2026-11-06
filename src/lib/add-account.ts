import { pendingAddAccountSchema, type PendingAddAccount } from '@karasu-lab/types/client';

export type { PendingAddAccount };

const STORAGE_KEY = 'pendingAddAccount';

export function savePendingAddAccount(pending: PendingAddAccount): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

export function takePendingAddAccount(): PendingAddAccount | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const result = pendingAddAccountSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
