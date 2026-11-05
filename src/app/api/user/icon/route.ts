import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteUploadedImage } from '@karasu-lab/utils/server';
import { fetchSetFirebasePhoto } from '@/lib/api/internal';
import { getProviderProfile } from '@/lib/auth/provider-profile';
import { requireSession } from '@/lib/api/require-session';
import { badRequest } from '@/lib/api/responses';

const putBodySchema = z.object({ providerId: z.string().min(1) });

/**
 * Removes the previous icon from the image API when it was hosted there and
 * differs from the value it's being replaced by.
 */
async function cleanupPreviousIcon(
  previousPhotoURL: string | undefined,
  nextPhotoURL: string | null,
  imageApiUrl: string | undefined,
  cookieHeader: string | null
): Promise<void> {
  if (!imageApiUrl || !cookieHeader || !previousPhotoURL || previousPhotoURL === nextPhotoURL) return;
  await deleteUploadedImage(previousPhotoURL, { imageApiUrl, cookieHeader });
}

/**
 * Sets the authenticated user's icon to a linked provider's avatar,
 * re-deriving the avatar URL from the provider account server-side rather
 * than trusting a client-supplied URL.
 *
 * PUT /api/user/icon
 */
export async function PUT(request: NextRequest) {
  const { user, error } = await requireSession();
  if (error) return error;

  const parsed = putBodySchema.safeParse(await request.json());
  if (!parsed.success) return badRequest();

  const profile = await getProviderProfile(parsed.data.providerId);
  if (!profile || !profile.avatarUrl) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const imageApiUrl = process.env.CDN_URL;
  const cookieHeader = (await headers()).get('cookie');

  const photo = await fetchSetFirebasePhoto(user.id, profile.avatarUrl);
  if (photo.linked) {
    await cleanupPreviousIcon(photo.previousPhotoURL ?? undefined, profile.avatarUrl, imageApiUrl, cookieHeader);
  }

  return NextResponse.json({ photoURL: profile.avatarUrl });
}

/**
 * Clears the authenticated user's icon, removing it from the image API when
 * it was hosted there.
 *
 * DELETE /api/user/icon
 */
export async function DELETE() {
  const { user, error } = await requireSession();
  if (error) return error;

  const imageApiUrl = process.env.CDN_URL;
  const cookieHeader = (await headers()).get('cookie');

  const photo = await fetchSetFirebasePhoto(user.id, null);
  if (photo.linked) {
    await cleanupPreviousIcon(photo.previousPhotoURL ?? undefined, null, imageApiUrl, cookieHeader);
  }

  return NextResponse.json({ photoURL: null });
}
