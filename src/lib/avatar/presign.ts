import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MissingEnvError } from '@karasu-lab/utils/server';

const PRESIGN_TTL_SECONDS = 300;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new MissingEnvError(name);
  return value;
}

export async function presignUploadUrl(path: string, contentType: string): Promise<string> {
  const client = new S3Client({
    endpoint: requireEnv('STORAGE_ENDPOINT'),
    region: 'auto',
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv('STORAGE_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('STORAGE_SECRET_ACCESS_KEY'),
    },
  });

  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: requireEnv('STORAGE_BUCKET'), Key: path, ContentType: contentType }),
    { expiresIn: PRESIGN_TTL_SECONDS, signableHeaders: new Set(['content-type']) }
  );
}
