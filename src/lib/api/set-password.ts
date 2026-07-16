/**
 * Sets a password for the authenticated user's account via the server-only
 * `auth.api.setPassword` (see `api/auth/set-password/route.ts`).
 *
 * @throws {Error} With the server's error message, when the request fails.
 */
export async function setPassword(newPassword: string): Promise<void> {
  const res = await fetch('/api/auth/set-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword }),
  });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? 'Failed to set password');
  }
}
