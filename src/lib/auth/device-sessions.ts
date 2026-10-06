import { authFetch } from '@/lib/auth/remote';

export interface DeviceSession {
  session: { token: string; createdAt: string };
  user: { id: string; name: string | null; email: string | null; image: string | null };
}

export async function listDeviceSessions(request: Request): Promise<DeviceSession[]> {
  const res = await authFetch('/api/auth/multi-session/list-device-sessions', request);
  if (!res.ok) return [];
  return (await res.json()) as DeviceSession[];
}

export function postMultiSession(path: 'set-active' | 'revoke', request: Request, sessionToken: string): Promise<Response> {
  return authFetch(`/api/auth/multi-session/${path}`, request, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken }),
  });
}
