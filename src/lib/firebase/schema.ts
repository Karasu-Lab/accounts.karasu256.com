import { z } from 'zod';

/** Zod schema that validates all required Firebase client-side configuration values. */
export const firebaseConfigSchema = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  databaseURL: z.string().url(),
  projectId: z.string().min(1),
  storageBucket: z.string().min(1),
  messagingSenderId: z.string().min(1),
  appId: z.string().min(1),
  measurementId: z.string().optional(),
});

/** Inferred TypeScript type for a validated Firebase configuration object. */
export type FirebaseConfig = z.infer<typeof firebaseConfigSchema>;

/**
 * Reads Firebase configuration from `NEXT_PUBLIC_FIREBASE_*` environment variables
 * and validates them against {@link firebaseConfigSchema}.
 *
 * @throws {ZodError} when any required environment variable is missing or invalid.
 */
export function parseFirebaseEnv(): FirebaseConfig {
  return firebaseConfigSchema.parse({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  });
}
