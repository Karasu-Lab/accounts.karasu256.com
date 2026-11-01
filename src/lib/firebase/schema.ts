import { z } from 'zod';

/** Zod schema that validates all required Firebase client-side configuration values. */
export const firebaseConfigSchema = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  databaseURL: z.string().url(),
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
