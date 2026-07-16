import { getNeonAuth, deriveNeonAuthPassword } from '@Hashibutogarasu/db';
import { ApiError } from '@Hashibutogarasu/utils/client';

/** The subset of a Firebase user's claims that Neon Auth provisioning needs. */
export interface FirebaseUserLike {
  uid: string;
  email?: string | null;
  name?: string | null;
}

/**
 * Ensures a Neon Auth session exists for the given Firebase user, creating a
 * Neon Auth account on first visit if needed.
 *
 * The password is derived server-side via HMAC and never exposed to clients,
 * so users experience a single sign-in through Firebase only.
 *
 * Must be called from a Route Handler or Server Action where Next.js cookies
 * can be written.
 */
export async function syncFirebaseUserToNeonAuth(user: FirebaseUserLike): Promise<void> {
  const email = user.email;
  if (!email) return;

  const auth = getNeonAuth();
  const password = deriveNeonAuthPassword(user.uid);
  const name = user.name ?? email;

  const signInResult = await auth.signIn.email({ email, password });
  if (!signInResult.error) return;

  const signUpResult = await auth.signUp.email({ email, password, name });
  if (signUpResult.error) {
    throw new ApiError(signUpResult.error.status, signUpResult.error.code ?? 'unknown');
  }
}
