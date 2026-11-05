import { createHash, createHmac } from 'node:crypto';
import { MissingEnvError } from '@karasu-lab/utils/server';

const PRESIGN_TTL_SECONDS = 300;
const REGION = 'auto';
const SERVICE = 's3';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new MissingEnvError(name);
  return value;
}

/** RFC 3986 percent-encoding, as required for SigV4 canonical strings. */
function encodeSegment(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

/**
 * Returns a presigned `PUT` URL for a direct browser upload to the
 * S3-compatible storage.
 *
 * The signature is computed directly instead of through the AWS SDK: the
 * SDK's Node.js runtime resolves its client configuration from the shared
 * AWS config files (`fs.readFile`) when an `S3Client` is constructed, and
 * that read is not implemented in the Workers runtime, which made every
 * `POST /api/user/icon/prepare` request fail before a URL could be issued.
 * SigV4 presigning only needs HMAC-SHA256, which the Workers runtime
 * provides through `node:crypto`.
 */
export async function presignUploadUrl(path: string, contentType: string): Promise<string> {
  const endpoint = new URL(requireEnv('STORAGE_ENDPOINT'));
  const bucket = requireEnv('STORAGE_BUCKET');
  const accessKeyId = requireEnv('STORAGE_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('STORAGE_SECRET_ACCESS_KEY');

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;

  const canonicalUri = `${endpoint.pathname.replace(/\/$/, '')}/${encodeSegment(bucket)}/${path.split('/').map(encodeSegment).join('/')}`;
  const signedHeaders = 'content-type;host';
  const query: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD'],
    ['X-Amz-Credential', `${accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(PRESIGN_TTL_SECONDS)],
    ['X-Amz-SignedHeaders', signedHeaders],
  ];
  const canonicalQueryString = query
    .slice()
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${encodeSegment(key)}=${encodeSegment(value)}`)
    .join('&');

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    `content-type:${contentType}\nhost:${endpoint.host}\n`,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), REGION), SERVICE), 'aws4_request');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const signature = hmac(signingKey, stringToSign).toString('hex');

  return `${endpoint.origin}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}
