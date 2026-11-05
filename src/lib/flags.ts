import { z } from 'zod';
import { createApiFlags } from '@karasu-lab/flags-sdk/server';

export const appFlagsSchema = z.object({
  testFlag: z.boolean(),
  useMinecraftAuth: z.boolean(),
});

export type AppFlags = z.infer<typeof appFlagsSchema>;

export function getAppFlags() {
  return createApiFlags(appFlagsSchema, {
    baseUrl: process.env.FEATURE_FLAGS_API_URL!,
    origin: process.env.FEATURE_FLAGS_ORIGIN!,
  });
}

/**
 * Whether Minecraft authentication is enabled by the `useMinecraftAuth`
 * flag on flagship. A flag that cannot be evaluated keeps Minecraft
 * authentication off, so a failing flag read never starts a Minecraft
 * profile resolution that is expected to fail.
 */
export async function isMinecraftAuthEnabled(): Promise<boolean> {
  return getAppFlags()
    .useMinecraftAuth()
    .catch(() => false);
}
