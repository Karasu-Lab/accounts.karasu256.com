import { z } from 'zod';
import type { ActiveSession } from '@karasu-lab/types/shared';

const sessionSourceSchema = z.string().min(1);

export const sessionSourceInfoSchema = z.object({
  raw: z.string().min(1),
  providerId: z.string().min(1),
});

export type SessionSourceInfo = z.infer<typeof sessionSourceInfoSchema>;

export const sessionWithSourceSchema = z.object({
  session: z.looseObject({ id: z.string().min(1) }),
  user: z.looseObject({ id: z.string().min(1) }),
  source: sessionSourceInfoSchema.nullable(),
});

export const sessionSourceParseSchema = z
  .object({ source: sessionSourceSchema, sessionId: z.string().min(1) })
  .transform(({ source, sessionId }, ctx) => {
    const suffix = `-${sessionId}`;
    if (!source.endsWith(suffix) || source.length === suffix.length) {
      ctx.issues.push({
        code: 'custom',
        message: 'The source was not built for this session',
        input: source,
      });
      return z.NEVER;
    }
    return { providerId: source.slice(0, -suffix.length), sessionId };
  });

export const activeSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
  source: sessionSourceSchema.nullable(),
  current: z.boolean(),
});

export type ActiveSessionListItem = Omit<ActiveSession, 'source'> & {
  source: SessionSourceInfo | null;
  disabled: boolean;
};
