import { getAuth, type Auth } from 'firebase/auth';
import { getFirebaseApp } from './app';

/** Lazily initialized Firebase Auth singleton. */
let firebaseAuth: Auth | undefined;

/**
 * Returns the Firebase Auth singleton, initializing it on first call
 * using the app returned by {@link getFirebaseApp}.
 *
 * Safe to call multiple times; subsequent calls return the cached instance.
 */
export function getFirebaseAuth(): Auth {
  if (firebaseAuth) return firebaseAuth;
  firebaseAuth = getAuth(getFirebaseApp());
  return firebaseAuth;
}
