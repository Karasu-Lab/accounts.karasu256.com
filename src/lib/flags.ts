import { z } from 'zod';
import { createApiFlags } from '@karasu-lab/flags-sdk/server';

export const appFlagsSchema = z.object({
  testFlag: z.boolean(),
});

export type AppFlags = z.infer<typeof appFlagsSchema>;

export const appFlags = createApiFlags(appFlagsSchema, {
  baseUrl: process.env.FEATURE_FLAGS_API_URL!,
  origin: process.env.FEATURE_FLAGS_ORIGIN!,
});
