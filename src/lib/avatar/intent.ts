import { createPrivateKey, createPublicKey, sign, verify, type KeyObject } from 'node:crypto';
import { z } from 'zod';
import { MissingEnvError } from '@karasu-lab/utils/server';

const INTENT_TTL_SECONDS = 600;

const intentSchema = z.object({
  userId: z.string().min(1),
  path: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  exp: z.number().int(),
});

export type UploadIntent = z.infer<typeof intentSchema>;

function privateKey(): KeyObject {
  const keyMaterial = process.env.APP_PRIVATE_KEY;
  if (!keyMaterial) throw new MissingEnvError('APP_PRIVATE_KEY');
  return createPrivateKey({ key: Buffer.from(keyMaterial, 'base64'), format: 'der', type: 'pkcs8' });
}

export function signUploadIntent(intent: Omit<UploadIntent, 'exp'>): string {
  const payload: UploadIntent = { ...intent, exp: Math.floor(Date.now() / 1000) + INTENT_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(null, Buffer.from(encoded), privateKey());
  return `${encoded}.${signature.toString('base64url')}`;
}

export function verifyUploadIntent(token: string, userId: string): UploadIntent | null {
  const [encoded, signature, ...rest] = token.split('.');
  if (!encoded || !signature || rest.length > 0) return null;

  const publicKey = createPublicKey(privateKey());
  if (!verify(null, Buffer.from(encoded), publicKey, Buffer.from(signature, 'base64url'))) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const parsed = intentSchema.safeParse(decoded);
  if (!parsed.success) return null;
  if (parsed.data.userId !== userId) return null;
  if (parsed.data.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed.data;
}
