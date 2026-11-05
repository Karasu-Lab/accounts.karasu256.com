import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api/require-session';
import { badRequest } from '@/lib/api/responses';
import { signUploadIntent } from '@/lib/avatar/intent';
import { avatarCdnPath } from '@/lib/avatar/paths';
import { presignUploadUrl } from '@/lib/avatar/presign';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: NextRequest) {
  const { user, error } = await requireSession();
  if (error) return error;

  const incoming = await request.formData();
  const file = incoming.get('file');
  if (!(file instanceof File)) return badRequest();
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'unsupported_media_type' }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const path = avatarCdnPath(user.id);

  const uploadUrl = await presignUploadUrl(path, file.type);
  const intent = signUploadIntent({ userId: user.id, path, sha256, contentType: file.type, size: bytes.byteLength });

  return NextResponse.json({ uploadUrl, intent });
}
