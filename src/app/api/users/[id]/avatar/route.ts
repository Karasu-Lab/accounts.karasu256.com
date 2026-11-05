import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api/require-session';
import { notFound } from '@/lib/api/responses';
import { getVerifiedAvatar } from '@/lib/avatar/icon';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSession();
  if (error) return error;

  const cdnUrl = process.env.CDN_URL;
  if (!cdnUrl) {
    return NextResponse.json({ error: 'image_api_not_configured' }, { status: 500 });
  }

  const { id } = await params;
  const version = request.nextUrl.searchParams.get('v');
  const avatar = await getVerifiedAvatar(id, version, cdnUrl);
  if (!avatar) return notFound();

  return new NextResponse(avatar.body, {
    headers: {
      'content-type': avatar.contentType,
      'cache-control': 'private, no-store',
    },
  });
}
