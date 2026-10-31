import { MissingEnvError } from '@karasu-lab/utils/server';

function apiUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) throw new MissingEnvError('API_URL');
  return `${base}${path}`;
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`api.karasu256.com responded ${res.status} for ${res.url}`);
  return (await res.json()) as T;
}

export interface ApiMeta {
  apiUrl: string;
  gitBranch: string;
}

export async function getApiMeta(): Promise<ApiMeta> {
  return readJson(await fetch(apiUrl('/meta'), { cache: 'no-store' }));
}

export async function listOauthScopes(): Promise<string[]> {
  return readJson(await fetch(apiUrl('/permissions/scopes'), { cache: 'no-store' }));
}
