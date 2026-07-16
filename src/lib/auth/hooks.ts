import type { User } from 'better-auth/types';
import { getAdminAuth } from '@/lib/firebase-admin';
import { syncFirebaseUserToNeonAuth } from '@/lib/neon-auth-bridge';

/**
 * better-auth's `user` row (name/image) is now the source of truth for
 * profile edits — see `profile-section.tsx`, which calls
 * `authClient.updateUser()` instead of writing to Firebase directly. Mirror
 * both fields onto the Firebase user immediately after any update (from the
 * profile form, or `account.accountLinking.updateUserInfoOnLink` copying a
 * newly linked provider's avatar) so Firebase — kept only for backing ID/auth
 * concerns — still reflects the current name and photo.
 */
export async function syncProfileToFirebase(user: User & { name?: string | null; image?: string | null }): Promise<void> {
  const update: { displayName?: string; photoURL?: string } = {};
  if (user.name) update.displayName = user.name;
  if (user.image) update.photoURL = user.image;
  if (Object.keys(update).length === 0) return;
  await getAdminAuth().updateUser(user.id, update);
}

/**
 * Provisions a Firebase user for every new better-auth user and forces
 * better-auth's `user.id` to equal the resulting Firebase UID — every table
 * and R2/CDN storage path in this monorepo is keyed by that id.
 */
export async function provisionFirebaseUser(user: User): Promise<{ data: User }> {
  const firebaseUser = await getAdminAuth().createUser({
    email: user.email || undefined,
    emailVerified: user.emailVerified,
    displayName: user.name || undefined,
  });
  return { data: { ...user, id: firebaseUser.uid } };
}

/** Mirrors a newly created better-auth user into Neon Auth (see `neon-auth-bridge.ts`). */
export async function syncNewUserToNeonAuth(user: User): Promise<void> {
  await syncFirebaseUserToNeonAuth({ uid: user.id, email: user.email, name: user.name });
}

/** Removes the backing Firebase user once better-auth has deleted its own row (mirrors {@link provisionFirebaseUser}). */
export async function deleteFirebaseUser(user: User): Promise<void> {
  await getAdminAuth().deleteUser(user.id);
}
