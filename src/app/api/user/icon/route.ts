import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/api/require-session';
import { badRequest } from '@/lib/api/responses';
import { deleteIcon, setIconFromProvider } from '@/lib/avatar/icon';

const putBodySchema = z.object({ providerId: z.string().min(1) });

export async function PUT(request: NextRequest) {
  const { user, error } = await requireSession();
  if (error) return error;

  const parsed = putBodySchema.safeParse(await request.json());
  if (!parsed.success) return badRequest();

  const cookieHeader = (await headers()).get('cookie');
  const photoURL = await setIconFromProvider(user.id, parsed.data.providerId, cookieHeader);
  if (!photoURL) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ photoURL });
}

export async function DELETE() {
  const { user, error } = await requireSession();
  if (error) return error;

  const cookieHeader = (await headers()).get('cookie');
  await deleteIcon(user.id, cookieHeader);

  return NextResponse.json({ photoURL: null });
}
