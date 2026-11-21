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

export type ServerConfig = {
  webauthn: z.infer<typeof webauthnSchema>;
  trustedOrigins: string[];
};

let cached: ServerConfig | undefined;

function parseConfig(raw: string | undefined, name: string) {
  if (raw === undefined) throw new Error(`The ${name} server config was not inlined at build time.`);
  return configFileSchema.parse(JSON.parse(raw));
}

function getEnvConfig() {
  if (process.env.APP_ENV === 'preview') return parseConfig(process.env.SERVER_CONFIG_PREVIEW, 'preview');
  return process.env.NODE_ENV === 'production'
    ? parseConfig(process.env.SERVER_CONFIG_PRODUCTION, 'production')
    : parseConfig(process.env.SERVER_CONFIG_DEVELOPMENT, 'development');
}

export function getServerConfig(): ServerConfig {
  if (cached !== undefined) return cached;

  const defaults = parseConfig(process.env.SERVER_CONFIG_DEFAULT, 'default');
  const overrides = getEnvConfig();

  const webauthn = webauthnSchema.parse({
    ...defaults.webauthn,
    ...overrides.webauthn,
  });
  const trustedOrigins = [...(overrides.trustedOrigins ?? defaults.trustedOrigins ?? [])];

  cached = { webauthn, trustedOrigins };
  return cached;
}
