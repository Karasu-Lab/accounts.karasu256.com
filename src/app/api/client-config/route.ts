import { getClientConfig } from '@/lib/auth/client-config';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(getClientConfig());
}
