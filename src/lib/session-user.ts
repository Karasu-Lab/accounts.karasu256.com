import { getSessionUser as getRemoteSessionUser } from '@Hashibutogarasu/utils/server';

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const user = await getRemoteSessionUser(process.env.NEXT_PUBLIC_AUTH_URL, process.env.VERCEL_PROTECTION_BYPASS_SECRET);
  if (!user) return null;
  return { id: user.uid, email: user.email, name: user.name, image: user.image };
}
