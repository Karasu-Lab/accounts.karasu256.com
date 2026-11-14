import { z } from 'zod';
import { ApiError } from '@karasu-lab/utils/client';
import type { AuthClientHandle } from '@/lib/auth/client';

const securitySettingsSchema = z.object({
  hasPassword: z.boolean(),
  passkeys: z.array(z.object({ id: z.string(), name: z.string().nullable(), createdAt: z.string().nullable() })),
});

export type SecuritySettings = z.output<typeof securitySettingsSchema>;

export async function getSecuritySettings({ config }: AuthClientHandle): Promise<SecuritySettings> {
  const response = await fetch(`${config.authApiUrl.replace(/\/+$/, '')}/api/users/me/security`, {
    credentials: 'include',
  });
  if (!response.ok) throw new ApiError(response.status, 'Request failed');
  return securitySettingsSchema.parse(await response.json());
}
