import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withUi } from '@karasu-lab/ui/next';
import { parse as parseYaml } from 'yaml';

/**
 * The hosts of `trustedOrigins` in `config/config.development.yml`, which the dev server must accept
 * HMR and dev resource requests from when the app is reached through the local cloudflared tunnel.
 */
const developmentTrustedHosts: string[] = (
  (parseYaml(fs.readFileSync(path.join(process.cwd(), 'config', 'config.development.yml'), 'utf-8')) as { trustedOrigins?: string[] })
    .trustedOrigins ?? []
).map((origin) => new URL(origin).hostname);

function inlineConfigFile(fileName: string): string {
  return JSON.stringify(parseYaml(fs.readFileSync(path.join(process.cwd(), 'config', fileName), 'utf-8')));
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@karasu-lab/ui', '@karasu-lab/utils', '@karasu-lab/flags', '@karasu-lab/sse'],
  devIndicators: false,
  allowedDevOrigins: developmentTrustedHosts,
  env: {
    SERVER_CONFIG_DEFAULT: inlineConfigFile('config.default.yml'),
    SERVER_CONFIG_DEVELOPMENT: inlineConfigFile('config.development.yml'),
    SERVER_CONFIG_PREVIEW: inlineConfigFile('config.preview.yml'),
    SERVER_CONFIG_PRODUCTION: inlineConfigFile('config.production.yml'),
  },
};

export default withUi(withNextIntl(nextConfig));
