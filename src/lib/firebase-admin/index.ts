import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth as getAdminAuthSdk } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestoreSdk } from 'firebase-admin/firestore';
import { getServerConfig } from '@/lib/config';

const ADMIN_APP_NAME = 'firebase-admin';

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === ADMIN_APP_NAME);
  if (existing) return existing;
  const { firebaseAdmin } = getServerConfig();
  return initializeApp(
    {
      credential: cert({
        projectId: firebaseAdmin.projectId,
        clientEmail: firebaseAdmin.clientEmail,
        privateKey: firebaseAdmin.privateKey,
      }),
      databaseURL: firebaseAdmin.databaseURL,
    },
    ADMIN_APP_NAME
  );
}

/**
 * Returns a Firebase Admin Auth instance bound to the named admin app.
 * Initializes the app on first call.
 */
export function getAdminAuth() {
  return getAdminAuthSdk(getAdminApp());
}

/**
 * Returns a Firebase Admin Firestore instance bound to the named admin app.
 * Initializes the app on first call.
 */
export function getAdminFirestore() {
  return getAdminFirestoreSdk(getAdminApp());
}
