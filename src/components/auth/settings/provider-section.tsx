'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faLinkSlash } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useTranslations } from 'next-intl';
import { toast, SettingsAccordion, SettingsItem } from '@Hashibutogarasu/ui';
import { unlinkProvider } from '@Hashibutogarasu/utils/client';
import { authClient } from '@/lib/auth/client';
import { LoadingButton } from '@/components/ui/loading-button';

export interface Provider {
  id: string;
  label: string;
  icon: IconDefinition;
}

interface ProviderSectionProps {
  providers: Provider[];
  initialProviders: string[];
}

/**
 * Displays linked OAuth providers with link/unlink controls.
 *
 * Linking hands off directly to `authClient.linkSocial`, which drives the
 * OAuth handshake against the browser's own better-auth session. Unlinking
 * removes the entry from `packages/db`'s `accounts` table.
 * Unlinking the last provider is blocked when the user has no registered
 * passkeys and no `credential` (email/password) account.
 */
export function ProviderSection({ providers, initialProviders }: ProviderSectionProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [linked, setLinked] = useState<string[]>(initialProviders);
  const [loading, setLoading] = useState<string | null>(null);
  const [hasPasskeys, setHasPasskeys] = useState(false);
  const [passkeysLoaded, setPasskeysLoaded] = useState(false);
  const handledParamsRef = useRef<string | null>(null);

  useEffect(() => {
    const paramsKey = searchParams.toString();
    if (!paramsKey || handledParamsRef.current === paramsKey) return;
    handledParamsRef.current = paramsKey;

    const error = searchParams.get('error');
    const linkedProvider = searchParams.get('linked');

    if (error) {
      const key = `connections.error.${error}`;
      toast.error(t.has(key) ? t(key) : t('connections.error.unknown'));
    } else if (linkedProvider) {
      toast.success(t('connections.linked', { provider: linkedProvider }), { autoClose: true });
    }
    router.replace(pathname);
  }, [searchParams, t, router, pathname]);

  useEffect(() => {
    void authClient.passkey
      .listUserPasskeys()
      .then(({ data }) => setHasPasskeys((data?.length ?? 0) > 0))
      .catch(() => {})
      .finally(() => setPasskeysLoaded(true));
  }, []);

  const dataReady = passkeysLoaded;
  const linkedIds = new Set(linked);
  const hasPasswordProvider = linked.includes('credential');
  const canUnlink = linked.length > 1 || hasPasskeys || hasPasswordProvider;

  async function handleLink(providerId: string) {
    setLoading(providerId);
    try {
      const linkingUrl = `${window.location.origin}/settings/linking`;
      const { error } = await authClient.linkSocial({
        provider: providerId,
        callbackURL: linkingUrl,
        errorCallbackURL: linkingUrl,
      });
      if (error) {
        const key = `connections.error.${error.code?.toLowerCase()}`;
        toast.error(t.has(key) ? t(key) : t('connections.error.unknown'));
        setLoading(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setLoading(null);
    }
  }

  async function handleUnlink(providerId: string) {
    setLoading(providerId);
    try {
      await unlinkProvider(providerId);
      setLinked((prev) => prev.filter((p) => p !== providerId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  return (
    <SettingsAccordion title={t('connections.title')}>
      <div className="space-y-3">
        {providers.map(({ id, label, icon }) => {
          const isLinked = linkedIds.has(id);
          const isLoading = loading === id;
          return (
            <SettingsItem key={id} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <FontAwesomeIcon icon={icon} />
                {label}
              </span>
              {isLinked ? (
                <LoadingButton
                  variant="destructive"
                  size="sm"
                  disabled={!canUnlink || isLoading || !dataReady}
                  onClick={() => handleUnlink(id)}
                  loading={isLoading || !dataReady}
                  icon={<FontAwesomeIcon icon={faLinkSlash} />}
                >
                  {isLoading ? t('connections.unlinking') : t('connections.unlink')}
                </LoadingButton>
              ) : (
                <LoadingButton
                  variant="outline"
                  size="sm"
                  disabled={isLoading || !dataReady}
                  onClick={() => handleLink(id)}
                  loading={isLoading || !dataReady}
                  icon={<FontAwesomeIcon icon={faLink} />}
                >
                  {t('connections.link')}
                </LoadingButton>
              )}
            </SettingsItem>
          );
        })}
        {dataReady && !canUnlink && <p className="text-xs text-muted-foreground">{t('connections.cannotUnlink')}</p>}
      </div>
    </SettingsAccordion>
  );
}
