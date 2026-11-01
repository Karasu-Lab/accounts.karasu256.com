const STORAGE_KEY = 'pendingAddAccount';

export interface PendingAddAccount {
  previousSessionToken: string | null;
  switchToNewAccount: boolean;
}

export function savePendingAddAccount(pending: PendingAddAccount): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

export function takePendingAddAccount(): PendingAddAccount | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAddAccount;
  } catch {
    return null;
  }
}
