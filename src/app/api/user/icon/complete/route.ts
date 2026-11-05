import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchSetFirebasePhoto, fetchVerifyUpload } from '@/lib/api/internal';
import { requireSession } from '@/lib/api/require-session';
import { badRequest } from '@/lib/api/responses';
import { verifyUploadIntent } from '@/lib/avatar/intent';

const bodySchema = z.object({ intent: z.string().min(1) });

export async function POST(request: NextRequest) {
  const { user, error } = await requireSession();
  if (error) return error;

  const cdnUrl = process.env.CDN_URL;
  if (!cdnUrl) {
    return NextResponse.json({ error: 'image_api_not_configured' }, { status: 500 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return badRequest();

  const intent = verifyUploadIntent(parsed.data.intent, user.id);
  if (!intent) return badRequest();

  const verified = await fetchVerifyUpload({
    path: intent.path,
    sha256: intent.sha256,
    contentType: intent.contentType,
    size: intent.size,
    uploaderId: user.id,
  });
  if (!verified) {
    return NextResponse.json({ error: 'upload_verification_failed' }, { status: 422 });
  }

  const photoURL = `${cdnUrl}/${intent.path}?v=${verified.sha256.slice(0, 16)}`;
  await fetchSetFirebasePhoto(user.id, photoURL);

  return NextResponse.json({ photoURL });
}
