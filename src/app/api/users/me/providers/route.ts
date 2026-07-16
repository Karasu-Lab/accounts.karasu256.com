import { NextResponse } from 'next/server';
import { getLinkedProviderIds } from '@Hashibutogarasu/db';
import { getProviderProfile, type ProviderProfile } from '@/lib/auth/provider-profile';
import { requireSession } from '@/lib/api/require-session';

/**
 * Returns the third-party providers linked to the authenticated user, keyed
 * by provider ID and including each provider's current profile.
 *
 * GET /api/users/me/providers
 */
export async function GET() {
  const { user, error } = await requireSession();
  if (error) return error;

  const providerIds = await getLinkedProviderIds(user.id);
  const profiles = await Promise.all(providerIds.map((providerId) => getProviderProfile(user.id, providerId)));

  const result: Record<string, ProviderProfile> = {};
  providerIds.forEach((providerId, i) => {
    result[providerId] = profiles[i] ?? { name: null, email: null, avatarUrl: null };
  });

  return NextResponse.json(result);
}
