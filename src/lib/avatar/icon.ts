import { createHash } from 'node:crypto';
import type { CompleteIconUploadResult, IconFileValidationError, PreparedIconUpload } from '@karasu-lab/types/shared';
import { deleteUploadedImage } from '@karasu-lab/utils/server';
import { fetchAvatarUploadUrl, fetchSetFirebasePhoto, fetchSetUserImage, fetchVerifyUpload } from '@/lib/api/internal';
import { getProviderProfile } from '@/lib/auth/provider-profile';
import { signUploadIntent, verifyUploadIntent } from './intent';

export const MAX_ICON_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ICON_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type { CompleteIconUploadResult, IconFileValidationError, PreparedIconUpload };

export function validateIconFile(contentType: string, size: number): IconFileValidationError | null {
  if (!ALLOWED_ICON_TYPES.has(contentType)) return 'unsupported_media_type';
  if (size === 0 || size > MAX_ICON_FILE_BYTES) return 'payload_too_large';
  return null;
}

export async function prepareIconUpload(userId: string, bytes: Buffer, contentType: string): Promise<PreparedIconUpload> {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const { uploadUrl, path } = await fetchAvatarUploadUrl(userId, contentType);
  const intent = signUploadIntent({ userId, path, sha256, contentType, size: bytes.byteLength });
  return { uploadUrl, intent };
}

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
  await fetchSetUserImage(userId, photoURL);
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


