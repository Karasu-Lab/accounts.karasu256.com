const STORAGE_KEY = 'pendingAddAccount';

export interface PendingAddAccount {
  previousSessionToken: string | null;
  /**
   * The better-auth user ID of the account that was active before
   * leaving for sign-in. Completing the addition compares it with the
   * signed-in account's user ID: when they match, the addition is the
   * same account, whose previous session `multiSession` has replaced,
   * so there is no previous session left to switch back to.
   */
  previousUserId: string | null;
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
