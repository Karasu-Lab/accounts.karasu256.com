import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Build-time values inlined into the server bundle so each deployment stays pinned
 * to the Neon branch it was built against, even if the runtime environment changes later.
 */
const buildTimeEnv: Record<string, string> = {
  NEON_BRANCH_NAME: process.env.NEON_BRANCH_NAME ?? 'main',
  ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
};

const nextConfig: NextConfig = {
  transpilePackages: ['@Hashibutogarasu/db', '@Hashibutogarasu/ui', '@Hashibutogarasu/utils', '@Hashibutogarasu/flags'],
  devIndicators: false,
  env: buildTimeEnv,
};

export default withNextIntl(nextConfig);
