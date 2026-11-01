/**
 * Sets a password for the authenticated user's account via api-auth.karasu256.com's
 * server-only `auth.api.setPassword` wrapper. The API's base URL is one
 * of the server-held configuration values, handed in by the caller.
 *
 * @throws {Error} With the server's error message, when the request fails.
 */
export async function setPassword(authApiUrl: string, newPassword: string): Promise<void> {
  const res = await fetch(`${authApiUrl}/api/auth/set-password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword }),
  });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? 'Failed to set password');
  }
}
