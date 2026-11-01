import { z } from 'zod';

/** Zod schema that validates all required Firebase client-side configuration values. */
export const firebaseConfigSchema = z.object({
  /* No web API key is configured: Firebase is only ever talked to by
     api.karasu256.com, whose service account — the project ID and the
     private key — is the proof of Firebase access. */
  apiKey: z.string().min(1).optional(),
  /* Firebase Authentication is not used on the client: sign-in runs
     through better-auth and the Firebase link state is managed with
     the Admin SDK, so no auth domain is configured. */
  authDomain: z.string().min(1).optional(),
  /* Neither the Realtime Database nor Firestore is referenced,
     so no database URL is configured. */
  databaseURL: z.string().url().optional(),
  projectId: z.string().min(1),
  /* Firebase Storage and Cloud Messaging are not used (files live in
     Cloudflare R2 and nothing sends messages), so neither is
     configured. */
  storageBucket: z.string().min(1).optional(),
  messagingSenderId: z.string().min(1).optional(),
  appId: z.string().min(1),
  measurementId: z.string().optional(),
});

/** Inferred TypeScript type for a validated Firebase configuration object. */
export type FirebaseConfig = z.infer<typeof firebaseConfigSchema>;

/**
 * Reads Firebase configuration from `FIREBASE_*` environment variables
 * and validates them against {@link firebaseConfigSchema}.
 *
 * @throws {ZodError} when any required environment variable is missing or invalid.
 */
export function parseFirebaseEnv(): FirebaseConfig {
  return firebaseConfigSchema.parse({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  });
}
