'use client';

import { useTranslations } from 'next-intl';
import { Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@Hashibutogarasu/ui';
import { useFeatureFlags } from '@Hashibutogarasu/flags/client';
import type { ApiMeta } from '@/lib/api/api-client';
import { appFlagsSchema } from '@/lib/flags';

interface DebugClientProps {
  apiMeta: ApiMeta | null;
}

/**
 * Displays the live value of this app's demo feature flags, sourced from Vercel Edge Config via `useFeatureFlags`,
 * and the API host and branch exactly as api.karasu256.com reports them, since it is the source of truth for both.
 */
export function DebugClient({ apiMeta }: DebugClientProps) {
  const t = useTranslations();
  const flags = useFeatureFlags<typeof appFlagsSchema>();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('debug.title')}</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t('debug.api.title')}</h2>
        {apiMeta === null ? (
          <p className="text-muted-foreground">{t('debug.api.unavailable')}</p>
        ) : (
          <>
            <section className="space-y-1">
              <h3 className="text-sm font-medium">{t('debug.api.host')}</h3>
              <p className="text-sm font-mono">{apiMeta.apiUrl}</p>
            </section>
            <section className="space-y-1">
              <h3 className="text-sm font-medium">{t('debug.api.branch')}</h3>
              <p className="text-sm font-mono">{apiMeta.gitBranch}</p>
            </section>
          </>
        )}
      </section>

      <h2 className="text-lg font-medium">{t('debug.flagsTitle')}</h2>

      {flags === null ? (
        <p className="text-muted-foreground">{t('debug.unavailable')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('debug.flagName')}</TableHead>
              <TableHead>{t('debug.flagValue')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(flags).map(([name, value]) => (
              <TableRow key={name}>
                <TableCell>{name}</TableCell>
                <TableCell>
                  <Switch checked={Boolean(value)} disabled />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
