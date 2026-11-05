import { NextRequest, NextResponse } from 'next/server';
import { getProviderProfile } from '@/lib/auth/provider-profile';
import { isMinecraftAuthEnabled } from '@/lib/flags';
import { requireSession } from '@/lib/api/require-session';

/**
 * Returns the authenticated user's profile for a single linked provider.
 *
 * While the `useMinecraftAuth` flag is off, the Minecraft profile is
 * not resolved and answers as not found, like an unlinked provider.
 *
 * GET /api/users/me/providers/[providerId]/details
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ providerId: string }> }) {
  const { error } = await requireSession();
  if (error) return error;

  const { providerId } = await params;
  if (providerId === 'minecraft' && !(await isMinecraftAuthEnabled())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const profile = await getProviderProfile(providerId);
  if (!profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(profile);
}
