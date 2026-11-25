import { z } from 'zod';

const webauthnSchema = z.object({
  rpId: z.string().min(1),
  rpName: z.string().min(1),
  expectedOrigins: z.array(z.string().url()).min(1),
});

export type ServerConfig = {
  webauthn: z.infer<typeof webauthnSchema>;
  trustedOrigins: string[];
};

let cached: ServerConfig | undefined;

function parseList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function getServerConfig(): ServerConfig {
  if (cached !== undefined) return cached;

  const webauthn = webauthnSchema.parse({
    rpId: process.env.WEBAUTHN_RP_ID,
    rpName: process.env.WEBAUTHN_RP_NAME,
    expectedOrigins: parseList(process.env.WEBAUTHN_EXPECTED_ORIGINS),
  });
  const trustedOrigins = z.array(z.string().url()).parse(parseList(process.env.TRUSTED_ORIGINS));

  cached = { webauthn, trustedOrigins };
  return cached;
}
