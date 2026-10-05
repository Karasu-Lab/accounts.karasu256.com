import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@Hashibutogarasu/db';
import { apiKeys } from '@Hashibutogarasu/db/schema';
import type { ApiKeyCreated, ApiKeySummary } from '@Hashibutogarasu/api-permissions';
import { auth } from '@/lib/auth/server';
import { getGrantedPermissions, grantPermissions } from '@/lib/api/api-client';

export { UnknownPermissionError } from '@Hashibutogarasu/api-permissions';

/** Returns the user's API keys with the permissions granted to each. */
export async function listApiKeys(userId: string): Promise<ApiKeySummary[]> {
  const rows = await getDb()
    .select({ id: apiKeys.id, name: apiKeys.name, start: apiKeys.start, createdAt: apiKeys.createdAt, lastRequest: apiKeys.lastRequest })
    .from(apiKeys)
    .where(eq(apiKeys.referenceId, userId))
    .orderBy(desc(apiKeys.createdAt));

  const granted = await getGrantedPermissions(rows.map((row) => row.id));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    start: row.start,
    createdAt: row.createdAt.toISOString(),
    lastRequest: row.lastRequest?.toISOString() ?? null,
    permissions: granted.get(row.id) ?? [],
  }));
}

/**
 * Issues a better-auth API key for the user and grants it the permissions identified by `permissionPublicIds`.
 * The key is deleted again when the grant fails, so a key never exists without the permissions it was issued for.
 *
 * @throws {UnknownPermissionError} when any public id doesn't match an active permission.
 */
export async function createApiKey(userId: string, name: string, permissionPublicIds: string[]): Promise<ApiKeyCreated> {
  const created = await auth.api.createApiKey({ body: { name, userId } });

  let permissions;
  try {
    permissions = await grantPermissions(created.id, permissionPublicIds);
  } catch (err) {
    await getDb().delete(apiKeys).where(eq(apiKeys.id, created.id));
    throw err;
  }

  return {
    id: created.id,
    name: created.name ?? null,
    start: created.start ?? null,
    createdAt: new Date(created.createdAt).toISOString(),
    lastRequest: null,
    permissions,
    key: created.key,
  };
}

/** Deletes one of the user's API keys, returning whether a key was deleted. */
export async function deleteApiKey(userId: string, apiKeyId: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.referenceId, userId)))
    .returning({ id: apiKeys.id });
  return deleted.length > 0;
}

/** Only key validity is checked here; api.karasu256.com resolves the key's permissions. */
export async function verifyApiKey(key: string): Promise<{ userId: string; keyId: string } | null> {
  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || !result.key) return null;
  return { userId: result.key.referenceId, keyId: result.key.id };
}
