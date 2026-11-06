import { NextRequest, NextResponse } from 'next/server';
import { intentTokenBodySchema } from '@karasu-lab/types/shared';
import { requireSession } from '@/lib/api/require-session';
import { badRequest } from '@/lib/api/responses';
import { completeIconUpload } from '@/lib/avatar/icon';

const bodySchema = intentTokenBodySchema;

export async function POST(request: NextRequest) {
  const { user, error } = await requireSession();
  if (error) return error;

  const cdnUrl = process.env.CDN_URL;
  if (!cdnUrl) {
    return NextResponse.json({ error: 'image_api_not_configured' }, { status: 500 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return badRequest();

  const result = await completeIconUpload(user.id, parsed.data.intent, cdnUrl);
  if (!result.ok) {
    if (result.error === 'invalid_intent') return badRequest();
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ photoURL: result.photoURL });
}
