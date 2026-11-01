import { NextResponse } from 'next/server';
import { fetchLinkedProviderIds } from '@/lib/api/internal';
import { getProviderProfile, type ProviderProfile } from '@/lib/auth/provider-profile';
import { requireSession } from '@/lib/api/require-session';

// `minecraft` has no account row; it is included when the Xbox link
// exists and the auth API resolves a profile for it.
const DERIVED_PROVIDER_IDS = ['minecraft'];

/**
 * Returns the third-party providers linked to the authenticated user, keyed
 * by provider ID and including each provider's current profile.
 *
 * GET /api/users/me/providers
 */
export async function GET() {
  const { user, error } = await requireSession();
  if (error) return error;

  const providerIds = await fetchLinkedProviderIds(user.id);
  const profiles = await Promise.all(providerIds.map((providerId) => getProviderProfile(providerId)));

  const result: Record<string, ProviderProfile> = {};
  providerIds.forEach((providerId, i) => {
    result[providerId] = profiles[i] ?? { name: null, email: null, avatarUrl: null };
  });

  if (providerIds.includes('xbox')) {
    const derivedProfiles = await Promise.all(DERIVED_PROVIDER_IDS.map((providerId) => getProviderProfile(providerId)));
    DERIVED_PROVIDER_IDS.forEach((providerId, i) => {
      const profile = derivedProfiles[i];
      if (profile) result[providerId] = profile;
    });
  }

  return NextResponse.json(result);
}
