import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withUi } from '@karasu-lab/ui/next';

const isDevelopment = process.env.NODE_ENV === 'development';

const localVars: Record<string, string> = isDevelopment
  ? (JSON.parse(fs.readFileSync(path.join(process.cwd(), 'wrangler.jsonc'), 'utf-8')) as { env: { local: { vars: Record<string, string> } } }).env.local.vars
  : {};

const developmentTrustedHosts: string[] = (localVars.TRUSTED_ORIGINS ?? '')
  .split(',')
  .filter((origin) => origin.length > 0)
  .map((origin) => new URL(origin).hostname);

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@karasu-lab/ui', '@karasu-lab/utils', '@karasu-lab/flags', '@karasu-lab/sse'],
  devIndicators: false,
  allowedDevOrigins: developmentTrustedHosts,
  env: localVars,
};

export default withUi(withNextIntl(nextConfig));
