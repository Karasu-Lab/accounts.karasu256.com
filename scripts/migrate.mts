import { spawnSync } from 'node:child_process';

/**
 * Decides whether this Vercel build should apply migrations: only production
 * deployments of `main`, i.e. after `dev` has been merged into `main`.
 */
function shouldMigrate(env: NodeJS.ProcessEnv): boolean {
  return env.VERCEL_ENV === 'production' && env.VERCEL_GIT_COMMIT_REF === 'main';
}

/**
 * Applies the accounts.karasu256.com Drizzle migrations over the direct (unpooled)
 * connection, exiting non-zero on failure so the build and deployment stop.
 */
function main(): void {
  const env = process.env;

  if (!shouldMigrate(env)) {
    console.log(
      `Skipping migrations (VERCEL_ENV=${env.VERCEL_ENV ?? ''}, ref=${env.VERCEL_GIT_COMMIT_REF ?? ''}, neon branch=${env.NEON_BRANCH_NAME ?? ''})`
    );
    return;
  }

  if (!env.DATABASE_URL_UNPOOLED) {
    console.error('DATABASE_URL_UNPOOLED is not set; refusing to migrate');
    process.exit(1);
  }

  console.log(`Applying migrations to Neon branch ${env.NEON_BRANCH_NAME ?? 'main'}`);
  const result = spawnSync('pnpm', ['--filter', 'accounts.karasu256.com', 'db:migrate:deploy'], {
    stdio: 'inherit',
    env: { ...env, DATABASE_URL: env.DATABASE_URL_UNPOOLED },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main();
