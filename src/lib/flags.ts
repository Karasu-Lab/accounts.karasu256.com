import { createApiFlags } from '@karasu-lab/flags/server';
import { appFlagsSchema } from '@karasu-lab/types/shared';

export { appFlagsSchema };

export function getAppFlags() {
  return createApiFlags(appFlagsSchema, {
    baseUrl: process.env.FEATURE_FLAGS_API_URL!,
    origin: process.env.FEATURE_FLAGS_ORIGIN!,
  });
}

export async function isMinecraftAuthEnabled(): Promise<boolean> {
  return getAppFlags()
    .useMinecraftAuth()
    .catch(() => false);
}
