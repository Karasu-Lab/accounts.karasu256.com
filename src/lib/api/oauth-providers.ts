import { z } from 'zod';
import { MissingEnvError } from '@karasu-lab/utils/server';

const themeColorSchema = z.object({ default: z.string(), dark: z.string() });

const oauthProvidersSchema = z.object({
  providers: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      kind: z.enum(['social', 'derived', 'passkey']),
      signIn: z.boolean(),
      link: z.boolean(),
      backgroundColor: themeColorSchema,
      foregroundColor: themeColorSchema,
      iconUrl: z.url(),
    })
  ),
});

export type OAuthProvider = z.infer<typeof oauthProvidersSchema>['providers'][number];

export async function fetchOAuthProviders(): Promise<OAuthProvider[]> {
  const base = process.env.API_URL;
  if (!base) throw new MissingEnvError('API_URL');
  const res = await fetch(`${base}/api/oauth/providers?usage=link`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`api.karasu256.com responded ${res.status} for ${res.url}`);
  return oauthProvidersSchema.parse(await res.json()).providers;
}
