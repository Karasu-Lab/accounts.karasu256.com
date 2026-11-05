import { NextRequest, NextResponse } from 'next/server';
import { fetchUploadStatus } from '@/lib/api/internal';
import { requireSession } from '@/lib/api/require-session';
import { notFound } from '@/lib/api/responses';
import { avatarCdnPath } from '@/lib/avatar/paths';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSession();
  if (error) return error;

  const cdnUrl = process.env.CDN_URL;
  if (!cdnUrl) {
    return NextResponse.json({ error: 'image_api_not_configured' }, { status: 500 });
  }

  const { id } = await params;
  const path = avatarCdnPath(id);
  const status = await fetchUploadStatus(path, id);
  if (!status) return notFound();

  const version = request.nextUrl.searchParams.get('v');
  const source = new URL(`${cdnUrl}/${path}`);
  if (version) source.searchParams.set('v', version);

  const res = await fetch(source, { cache: 'no-store' });
  if (!res.ok || !res.body) return notFound();

  return new NextResponse(res.body, {
    headers: {
      'content-type': res.headers.get('content-type') ?? status.contentType ?? 'application/octet-stream',
      'cache-control': 'private, no-store',
    },
  });
}
