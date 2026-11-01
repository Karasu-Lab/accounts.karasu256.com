import { fetchLinkedFirebaseUid } from '@/lib/api/internal';

/**
 * Returns the Firebase UID linked to a better-auth user, or null when
 * the user is not linked yet. The link lives in the database, whose
 * access is owned by api.karasu256.com, so the value comes from the
 * API rather than a direct read. Sign-in does not depend on this link;
 * callers must treat null as "no Firebase user to talk to" and skip
 * Firebase-side work.
 */
export async function getLinkedFirebaseUid(userId: string): Promise<string | null> {
  return fetchLinkedFirebaseUid(userId);
}
