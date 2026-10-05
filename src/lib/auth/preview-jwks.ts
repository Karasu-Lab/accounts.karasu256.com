import { sql } from 'drizzle-orm';
import { getDb } from '@Hashibutogarasu/db/client';
import { jwks } from '@Hashibutogarasu/db/schema';
import { auth } from '@/lib/auth/server';
import { isBranchPreviewDeployment } from '@/lib/config';

/** Neon branch ID of the production `main` branch, whose JWKS must never be reset. */
const PRODUCTION_NEON_BRANCH_ID = 'br-jolly-block-adds5r56';

/**
 * Removes JWKS rows a branch preview database inherited from production.
 *
 * Preview Neon branches are copied from `main`, so their `jwks` table holds keys
 * encrypted with the production `BETTER_AUTH_SECRET`, which the preview secret
 * cannot decrypt, and every session lookup then fails. When signing with the
 * current key fails to decrypt, all keys are deleted so better-auth generates a
 * fresh one with the preview secret. Runs only on branch previews connected to a
 * Neon branch other than production, and never throws so startup is unaffected.
 */
export async function resetInheritedJwks(): Promise<void> {
  if (!isBranchPreviewDeployment()) return;

  try {
    const db = getDb();
    const [row] = await db.execute<{ branchId: string | null }>(sql`select current_setting('neon.branch_id', true) as "branchId"`);
    if (!row?.branchId || row.branchId === PRODUCTION_NEON_BRANCH_ID) return;

    try {
      await auth.api.signJWT({ body: { payload: {} } });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Failed to decrypt private key')) throw error;
      await db.delete(jwks);
      console.log(`Reset JWKS inherited from production on Neon branch ${row.branchId}`);
    }
  } catch (error) {
    console.error('Failed to reset inherited JWKS', error);
  }
}
