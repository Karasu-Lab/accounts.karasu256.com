import { spawnSync } from 'node:child_process';

/** Compute endpoint of the production `main` Neon branch, which only production builds of `main` may migrate. */
const PRODUCTION_NEON_ENDPOINT_ID = 'ep-dry-dream-adty8lfk';

function isProductionDatabase(databaseUrl: string): boolean {
  return new URL(databaseUrl).hostname.startsWith(`${PRODUCTION_NEON_ENDPOINT_ID}.`);
}

/**
 * Decides whether this Vercel build should apply migrations: production
 * deployments of `main`, and preview deployments, whose Neon branch is copied
 * from production and therefore lacks migrations that have not reached `main` yet.
 */
function shouldMigrate(env: NodeJS.ProcessEnv): boolean {
  if (env.VERCEL_ENV === 'preview') return true;
  return env.VERCEL_ENV === 'production' && env.VERCEL_GIT_COMMIT_REF === 'main';
}

/**
 * Applies the accounts.karasu256.com Drizzle migrations over the direct (unpooled)
 * connection, exiting non-zero on failure so the build and deployment stop.
 */
function main(): void {
  const env = process.env;

  if (!shouldMigrate(env)) {
    console.log(`Skipping migrations (VERCEL_ENV=${env.VERCEL_ENV ?? ''}, ref=${env.VERCEL_GIT_COMMIT_REF ?? ''})`);
    return;
  }

  if (!env.DATABASE_URL_UNPOOLED) {
    console.error('DATABASE_URL_UNPOOLED is not set; refusing to migrate');
    process.exit(1);
  }

  if (env.VERCEL_ENV === 'preview' && isProductionDatabase(env.DATABASE_URL_UNPOOLED)) {
    console.error('Preview deployment is connected to the production Neon branch; refusing to migrate');
    process.exit(1);
  }

  console.log(`Applying migrations (VERCEL_ENV=${env.VERCEL_ENV}, ref=${env.VERCEL_GIT_COMMIT_REF ?? ''})`);
  const result = spawnSync('pnpm', ['--filter', 'accounts.karasu256.com', 'db:migrate:deploy'], {
    stdio: 'inherit',
    env: { ...env, DATABASE_URL: env.DATABASE_URL_UNPOOLED },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main();
