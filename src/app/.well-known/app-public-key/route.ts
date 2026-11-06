import { createPrivateKey, createPublicKey } from 'node:crypto';
import { NextResponse } from 'next/server';
import { MissingEnvError } from '@karasu-lab/utils/server';

export function GET() {
  const appId = process.env.APP_ID;
  if (!appId) throw new MissingEnvError('APP_ID');
  const keyMaterial = process.env.APP_PRIVATE_KEY;
  if (!keyMaterial) throw new MissingEnvError('APP_PRIVATE_KEY');

  const privateKey = createPrivateKey({ key: Buffer.from(keyMaterial, 'base64'), format: 'der', type: 'pkcs8' });
  const publicKey = createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
  return NextResponse.json({ appId, publicKey: Buffer.from(publicKey).toString('base64') });
}
