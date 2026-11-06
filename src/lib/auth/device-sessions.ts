import type { DeviceSession } from '@karasu-lab/types/shared';
import { authFetch } from '@/lib/auth/remote';

export type { DeviceSession };

export async function listDeviceSessions(request: Request): Promise<DeviceSession[]> {
  const res = await authFetch('/api/auth/multi-session/list-device-sessions', request);
  if (!res.ok) return [];
  return (await res.json()) as DeviceSession[];
}

export function postMultiSession(path: 'set-active' | 'revoke', request: Request, sessionToken: string): Promise<Response> {
  return authFetch(`/api/auth/multi-session/${path}`, request, {
    method: 'POST',
    body: JSON.stringify({ sessionToken }),
  });
}
