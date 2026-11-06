import { createPrivateKey, createPublicKey, sign, verify, type KeyObject } from 'node:crypto';
import { signedUploadIntentSchema, type SignedUploadIntent } from '@karasu-lab/types/server';
import { MissingEnvError } from '@karasu-lab/utils/server';

export type UploadIntent = SignedUploadIntent;

const INTENT_TTL_SECONDS = 600;

function privateKey(): KeyObject {
  const keyMaterial = process.env.APP_PRIVATE_KEY;
  if (!keyMaterial) throw new MissingEnvError('APP_PRIVATE_KEY');
  return createPrivateKey({ key: Buffer.from(keyMaterial, 'base64'), format: 'der', type: 'pkcs8' });
}

export function signUploadIntent(intent: Omit<SignedUploadIntent, 'exp'>): string {
  const payload: SignedUploadIntent = { ...intent, exp: Math.floor(Date.now() / 1000) + INTENT_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(null, Buffer.from(encoded), privateKey());
  return `${encoded}.${signature.toString('base64url')}`;
}

export function verifyUploadIntent(token: string, userId: string): SignedUploadIntent | null {
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
  const parsed = signedUploadIntentSchema.safeParse(decoded);
  if (!parsed.success) return null;
  if (parsed.data.userId !== userId) return null;
  if (parsed.data.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed.data;
}
