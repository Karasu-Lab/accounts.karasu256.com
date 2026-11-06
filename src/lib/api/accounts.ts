import type { AccountSummary, ListAccountsResult } from '@karasu-lab/types/shared';
import { ApiError } from '@karasu-lab/utils/client';

export type { AccountSummary, ListAccountsResult };

export async function listAccounts(): Promise<ListAccountsResult> {
  const res = await fetch('/api/accounts');
  if (!res.ok) throw ApiError.fromResponse(res);
  return res.json() as Promise<ListAccountsResult>;
}

export async function switchAccount(sessionToken: string): Promise<{ ok: true; uid: string }> {
  const res = await fetch('/api/accounts/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken }),
  });
  if (!res.ok) throw ApiError.fromResponse(res);
  return res.json() as Promise<{ ok: true; uid: string }>;
}

export async function removeAccount(sessionToken: string): Promise<{ ok: true }> {
  const res = await fetch('/api/accounts/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken }),
  });
  if (!res.ok) throw ApiError.fromResponse(res);
  return res.json() as Promise<{ ok: true }>;
}
