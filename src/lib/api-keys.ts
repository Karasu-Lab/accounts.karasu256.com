import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '@Hashibutogarasu/db';
import { apiKeyPermissions, apiKeys, permissions } from '@Hashibutogarasu/db/schema';
import { permissionBitmask } from '@Hashibutogarasu/permissions';
import { auth } from '@/lib/auth/server';

export interface PermissionSummary {
  publicId: string;
  numericId: number;
  resource: string;
  action: string;
}

export interface ApiKeySummary {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: string;
  lastRequest: string | null;
  permissions: PermissionSummary[];
}

export interface ApiKeyCreated extends ApiKeySummary {
  key: string;
}

/** Thrown when a caller references a permission that doesn't exist or has been deleted. */
export class UnknownPermissionError extends Error {}

function toPermissionSummary(row: { publicId: string; numericId: number }): PermissionSummary | null {
  const permission = permissionBitmask.fromId(row.numericId);
  if (!permission) return null;
  return { publicId: row.publicId, numericId: row.numericId, resource: permission.resource(), action: permission.action() };
}

function toPermissionSummaries(rows: { publicId: string; numericId: number }[]): PermissionSummary[] {
  return rows.map(toPermissionSummary).filter((summary): summary is PermissionSummary => summary !== null);
}

/** Returns every active (not soft-deleted) permission that the code registry also knows about. */
export async function listActivePermissions(): Promise<PermissionSummary[]> {
  const rows = await getDb()
    .select({ publicId: permissions.publicId, numericId: permissions.numericId })
    .from(permissions)
    .where(isNull(permissions.deletedAt))
    .orderBy(permissions.numericId);
  return toPermissionSummaries(rows);
}

async function getGrantedPermissions(apiKeyIds: string[]): Promise<Map<string, PermissionSummary[]>> {
  const granted = new Map<string, PermissionSummary[]>();
  if (apiKeyIds.length === 0) return granted;

  const rows = await getDb()
    .select({ apiKeyId: apiKeyPermissions.apiKeyId, publicId: permissions.publicId, numericId: permissions.numericId })
    .from(apiKeyPermissions)
    .innerJoin(permissions, eq(apiKeyPermissions.permissionId, permissions.id))
    .where(and(inArray(apiKeyPermissions.apiKeyId, apiKeyIds), isNull(permissions.deletedAt)));

  for (const row of rows) {
    const summary = toPermissionSummary(row);
    if (!summary) continue;
    granted.set(row.apiKeyId, [...(granted.get(row.apiKeyId) ?? []), summary]);
  }
  return granted;
}

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
 *
 * @throws {UnknownPermissionError} when any public id doesn't match an active permission.
 */
export async function createApiKey(userId: string, name: string, permissionPublicIds: string[]): Promise<ApiKeyCreated> {
  const db = getDb();
  const uniquePublicIds = [...new Set(permissionPublicIds)];
  const rows =
    uniquePublicIds.length === 0
      ? []
      : await db
          .select({ id: permissions.id, publicId: permissions.publicId, numericId: permissions.numericId })
          .from(permissions)
          .where(and(inArray(permissions.publicId, uniquePublicIds), isNull(permissions.deletedAt)));
  if (rows.length !== uniquePublicIds.length) throw new UnknownPermissionError();

  const created = await auth.api.createApiKey({ body: { name, userId } });

  if (rows.length > 0) {
    try {
      await db.insert(apiKeyPermissions).values(rows.map((row) => ({ apiKeyId: created.id, permissionId: row.id })));
    } catch (err) {
      await db.delete(apiKeys).where(eq(apiKeys.id, created.id));
      throw err;
    }
  }

  return {
    id: created.id,
    name: created.name ?? null,
    start: created.start ?? null,
    createdAt: new Date(created.createdAt).toISOString(),
    lastRequest: null,
    permissions: toPermissionSummaries(rows),
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

/** Verifies a raw API key, returning its owner and the bitmask of its granted permissions, or `null` if the key is invalid. */
export async function verifyApiKey(key: string): Promise<{ userId: string; permissions: bigint } | null> {
  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || !result.key) return null;

  const granted = (await getGrantedPermissions([result.key.id])).get(result.key.id) ?? [];
  const grantedPermissions = granted.map((summary) => permissionBitmask.fromId(summary.numericId)).filter((permission) => permission !== undefined);
  return { userId: result.key.referenceId, permissions: permissionBitmask.build(grantedPermissions) };
}
