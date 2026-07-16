import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const webauthnSchema = z.object({
  rpId: z.string().min(1),
  rpName: z.string().min(1),
  expectedOrigins: z.array(z.string().url()).min(1),
});

const configFileSchema = z.object({
  webauthn: webauthnSchema.partial(),
  trustedOrigins: z.array(z.string().url()).optional(),
});

const envSchema = z.object({
  firebaseAdmin: z.object({
    projectId: z.string().min(1),
    clientEmail: z.string().email(),
    privateKey: z.string().min(1),
    databaseURL: z.string().url(),
  }),
  resend: z.object({
    apiKey: z.string().min(1),
    fromEmail: z.string().email(),
  }),
  baseDomain: z.string().optional(),
});

export type ServerConfig = {
  webauthn: z.infer<typeof webauthnSchema>;
  firebaseAdmin: z.infer<typeof envSchema>['firebaseAdmin'];
  resend: z.infer<typeof envSchema>['resend'];
  baseDomain?: string;
  /** Origins allowed to make credentialed cross-origin calls into this app's better-auth instance (see `auth-options.ts`'s `trustedOrigins` and `lib/auth/cors.ts`). */
  trustedOrigins: string[];
};

let cached: ServerConfig | undefined;

/** Reads and validates one `config/*.yml` file as a partial config. */
function readConfigFile(fileName: string) {
  const filePath = path.join(process.cwd(), 'config', fileName);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return configFileSchema.parse(parseYaml(raw));
}

/**
 * Selects the environment-specific config file name: `config.preview.yml` on
 * Vercel Preview deployments (`VERCEL_ENV=preview`, e.g. dev.accounts.karasu256.com,
 * which serves a real host distinct from both localhost and production),
 * otherwise `config.production.yml` or `config.development.yml` by `NODE_ENV`.
 */
function getEnvConfigFileName(): string {
  if (process.env.VERCEL_ENV === 'preview') return 'config.preview.yml';
  return process.env.NODE_ENV === 'production' ? 'config.production.yml' : 'config.development.yml';
}

/**
 * Returns the validated server configuration, merging `config/config.default.yml`
 * with the environment-specific config file (the latter overriding the
 * former) and server-only environment variables. Result is cached for the
 * lifetime of the Node.js process.
 *
 * @throws when a config file is missing or the merged result fails validation.
 */
export function getServerConfig(): ServerConfig {
  if (cached !== undefined) return cached;

  const defaults = readConfigFile('config.default.yml');
  const overrides = readConfigFile(getEnvConfigFileName());
  const webauthn = webauthnSchema.parse({ ...defaults.webauthn, ...overrides.webauthn });
  const trustedOrigins = overrides.trustedOrigins ?? defaults.trustedOrigins ?? [];

  const envData = envSchema.parse({
    firebaseAdmin: {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    },
    resend: {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL,
    },
    baseDomain: process.env.BASE_DOMAIN,
  });

  cached = { webauthn, trustedOrigins, ...envData };
  return cached;
}
