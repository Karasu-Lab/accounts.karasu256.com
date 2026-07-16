'use client';

import { useTranslations } from 'next-intl';
import { Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@Hashibutogarasu/ui';
import { useFeatureFlags } from '@Hashibutogarasu/flags/client';
import { appFlagsSchema } from '@/lib/flags';

/** Displays the live value of this app's demo feature flags, sourced from Vercel Edge Config via `useFeatureFlags`. */
export function DebugClient() {
  const t = useTranslations();
  const flags = useFeatureFlags<typeof appFlagsSchema>();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('debug.title')}</h1>

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
