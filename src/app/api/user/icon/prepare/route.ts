import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api/require-session';
import { badRequest } from '@/lib/api/responses';
import { prepareIconUpload, validateIconFile } from '@/lib/avatar/icon';

export async function POST(request: NextRequest) {
  const { user, error } = await requireSession();
  if (error) return error;

  const incoming = await request.formData();
  const file = incoming.get('file');
  if (!(file instanceof File)) return badRequest();

  const validationError = validateIconFile(file.type, file.size);
  if (validationError === 'unsupported_media_type') {
    return NextResponse.json({ error: validationError }, { status: 415 });
  }
  if (validationError === 'payload_too_large') {
    return NextResponse.json({ error: validationError }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const prepared = await prepareIconUpload(user.id, bytes, file.type);
  return NextResponse.json(prepared);
}
