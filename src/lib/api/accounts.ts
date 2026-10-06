import { ApiError } from '@Hashibutogarasu/utils/client';

export interface AccountSummary {
  uid: string;
  sessionToken: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  addedAt: string;
}

export interface ListAccountsResult {
  activeUid: string | null;
  accounts: AccountSummary[];
}

/**
 * Lists the accounts bridged into `multiSession` on this device.
 *
 * @throws {ApiError} When the request fails with a non-ok HTTP status.
 */
export async function listAccounts(): Promise<ListAccountsResult> {
  const res = await fetch('/api/accounts');
  if (!res.ok) throw ApiError.fromResponse(res);
  return res.json() as Promise<ListAccountsResult>;
}

/**
 * @throws {ApiError} When the request fails with a non-ok HTTP status.
 */
export async function switchAccount(sessionToken: string): Promise<{ ok: true; uid: string }> {
  const res = await fetch('/api/accounts/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken }),
  });
  if (!res.ok) throw ApiError.fromResponse(res);
  return res.json() as Promise<{ ok: true; uid: string }>;
}

/**
 * @throws {ApiError} When the request fails with a non-ok HTTP status.
 */
export async function removeAccount(sessionToken: string): Promise<{ ok: true }> {
  const res = await fetch('/api/accounts/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken }),
  });
  if (!res.ok) throw ApiError.fromResponse(res);
  return res.json() as Promise<{ ok: true }>;
}
