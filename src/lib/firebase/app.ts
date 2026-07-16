import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { parseFirebaseEnv } from './schema';

/** Lazily initialized Firebase application singleton. */
let firebaseApp: FirebaseApp | undefined;

/**
 * Returns the Firebase application singleton, initializing it on first call
 * using environment variables validated by {@link parseFirebaseEnv}.
 *
 * Safe to call multiple times; subsequent calls return the cached instance.
 */
export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }
  const existing = getApps()[0];
  firebaseApp = existing ?? initializeApp(parseFirebaseEnv());
  return firebaseApp;
}
