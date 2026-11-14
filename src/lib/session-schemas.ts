import { z } from 'zod';

const sessionSourceSchema = z.string().min(1);

export const sessionWithSourceSchema = z.object({
  session: z.looseObject({ id: z.string().min(1) }),
  user: z.looseObject({ id: z.string().min(1) }),
  source: sessionSourceSchema.nullable(),
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
