import { createHash } from 'node:crypto';
import { deleteUploadedImage } from '@karasu-lab/utils/server';
import { fetchSetFirebasePhoto, fetchUploadStatus, fetchVerifyUpload } from '@/lib/api/internal';
import { getProviderProfile } from '@/lib/auth/provider-profile';
import { signUploadIntent, verifyUploadIntent } from './intent';
import { avatarCdnPath } from './paths';
import { presignUploadUrl } from './presign';

export const MAX_ICON_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ICON_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type IconFileValidationError = 'unsupported_media_type' | 'payload_too_large';

export function validateIconFile(contentType: string, size: number): IconFileValidationError | null {
  if (!ALLOWED_ICON_TYPES.has(contentType)) return 'unsupported_media_type';
  if (size === 0 || size > MAX_ICON_FILE_BYTES) return 'payload_too_large';
  return null;
}

export interface PreparedIconUpload {
  uploadUrl: string;
  intent: string;
}

export async function prepareIconUpload(userId: string, bytes: Buffer, contentType: string): Promise<PreparedIconUpload> {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const path = avatarCdnPath(userId);
  const uploadUrl = await presignUploadUrl(path, contentType);
  const intent = signUploadIntent({ userId, path, sha256, contentType, size: bytes.byteLength });
  return { uploadUrl, intent };
}

export type CompleteIconUploadResult = { ok: true; photoURL: string } | { ok: false; error: 'invalid_intent' | 'upload_verification_failed' };

export async function completeIconUpload(userId: string, intentToken: string, cdnUrl: string): Promise<CompleteIconUploadResult> {
  const intent = verifyUploadIntent(intentToken, userId);
  if (!intent) return { ok: false, error: 'invalid_intent' };

  const verified = await fetchVerifyUpload({
    path: intent.path,
    sha256: intent.sha256,
    contentType: intent.contentType,
    size: intent.size,
    uploaderId: userId,
  });
  if (!verified) return { ok: false, error: 'upload_verification_failed' };

  const photoURL = `${cdnUrl}/${intent.path}?v=${verified.sha256.slice(0, 16)}`;
  await fetchSetFirebasePhoto(userId, photoURL);
  return { ok: true, photoURL };
}

async function cleanupPreviousIcon(
  previousPhotoURL: string | undefined,
  nextPhotoURL: string | null,
  imageApiUrl: string | undefined,
  cookieHeader: string | null
): Promise<void> {
  if (!imageApiUrl || !cookieHeader || !previousPhotoURL || previousPhotoURL === nextPhotoURL) return;
  await deleteUploadedImage(previousPhotoURL, { imageApiUrl, cookieHeader });
}

export async function setIconFromProvider(userId: string, providerId: string, cookieHeader: string | null): Promise<string | null> {
  const profile = await getProviderProfile(providerId);
  if (!profile || !profile.avatarUrl) return null;

  const photo = await fetchSetFirebasePhoto(userId, profile.avatarUrl);
  if (photo.linked) {
    await cleanupPreviousIcon(photo.previousPhotoURL ?? undefined, profile.avatarUrl, process.env.CDN_URL, cookieHeader);
  }
  return profile.avatarUrl;
}

export async function deleteIcon(userId: string, cookieHeader: string | null): Promise<void> {
  const photo = await fetchSetFirebasePhoto(userId, null);
  if (photo.linked) {
    await cleanupPreviousIcon(photo.previousPhotoURL ?? undefined, null, process.env.CDN_URL, cookieHeader);
  }
}

export interface VerifiedAvatar {
  body: ReadableStream<Uint8Array>;
  contentType: string;
}

export async function getVerifiedAvatar(userId: string, version: string | null, cdnUrl: string): Promise<VerifiedAvatar | null> {
  const path = avatarCdnPath(userId);
  const status = await fetchUploadStatus(path, userId);
  if (!status) return null;

  const source = new URL(`${cdnUrl}/${path}`);
  if (version) source.searchParams.set('v', version);

  const res = await fetch(source, { cache: 'no-store' });
  if (!res.ok || !res.body) return null;

  return {
    body: res.body,
    contentType: res.headers.get('content-type') ?? status.contentType ?? 'application/octet-stream',
  };
}
