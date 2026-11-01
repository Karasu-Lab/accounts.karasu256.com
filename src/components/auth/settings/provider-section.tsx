'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Link2, LoaderCircle, Unlink } from 'lucide-react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useTranslations } from 'next-intl';
import { toast, ConfirmDialog } from '@karasu-lab/ui';
import { unlinkProvider } from '@karasu-lab/utils/client';
import { useAuthClient } from '@/lib/auth/client';
import type { ProviderProfile } from '@/lib/auth/provider-profile';
import { SettingsItemGroup } from '@/components/settings/settings-item-container';
import { LinkedSettingsItem } from '@/components/auth/settings/linked-settings-item';
import { cn } from '@/lib/utils';

export interface Provider {
  id: string;
  label: string;
  icon: IconDefinition;
  // The provider's avatar URL is a raw skin texture that the client
  // converts into an avatar (Minecraft), not a finished image.
  textureAvatar?: boolean;
  // The account-row provider this row's link state belongs to, when
  // it differs from the row's own ID. Linking navigates to that
  // provider's dedicated link flow instead of a social link, and
  // unlinking deletes that account.
  accountProviderId?: string;
  // Account-row providers deleted together with this one on unlink.
  linkedAccountProviderIds?: string[];
}

interface ProviderSectionProps {
  providers: Provider[];
  /**
   * Each provider's profile as resolved by auth.karasu256.com's
   * provider profile API. A provider is linked exactly when its profile
   * is non-null; this section never judges the linked state from any
   * other source.
   */
  initialProfiles: Record<string, ProviderProfile | null>;
}

/** Brand tile colors for the providers, keyed by provider ID. */
const PROVIDER_ICON_BACKGROUND_COLORS: Record<string, string> = {
  google: '#4285f4',
  github: '#24292f',
  microsoft: '#00adef',
  xbox: '#107c10',
};

/**
 * Displays linked OAuth providers with link/unlink controls, as
 * {@link LinkedSettingsItem}s in a settings item group (no accordion).
 *
 * A linked provider's item shows the linked account's name as its title
 * and its email address as its description, with the account's avatar
 * in the icon tile and the provider's icon as a small badge on the
 * avatar's bottom-right corner. The item itself never responds to taps; the only
 * action is the icon button at its right end — an unlink icon for a
 * linked provider, which opens an unlink confirmation, and a link icon
 * for a provider that is not linked yet.
 *
 * Linking hands off directly to `authClient.linkSocial`, which drives the
 * OAuth handshake against the browser's own better-auth session.
 * Unlinking removes the entry from `packages/db`'s `accounts` table.
 * Unlinking the last provider is blocked when the user has no registered
 * passkeys and no `credential` (email/password) account.
 */
export function ProviderSection({ providers, initialProfiles }: ProviderSectionProps) {
  const { authClient, config } = useAuthClient();
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<Record<string, ProviderProfile | null>>(initialProfiles);
  const [loading, setLoading] = useState<string | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<Provider | null>(null);
  const [hasPasskeys, setHasPasskeys] = useState(false);
  const [hasPasswordProvider, setHasPasswordProvider] = useState(false);
  const [guardsLoaded, setGuardsLoaded] = useState(false);
  const handledParamsRef = useRef<string | null>(null);

  useEffect(() => {
    const paramsKey = searchParams.toString();
    if (!paramsKey || handledParamsRef.current === paramsKey) return;
    handledParamsRef.current = paramsKey;

    const error = searchParams.get('error');
    const linkedProvider = searchParams.get('linked');

    if (error) {
      const errorDescription = searchParams.get('error_description');
      const key = `connections.error.${error}`;
      toast.error(errorDescription ?? (t.has(key) ? t(key) : t('connections.error.unknown')));
    } else if (linkedProvider) {
      toast.success(t('connections.linked', { provider: linkedProvider }), { autoClose: true });
    }
    router.replace(pathname);
  }, [searchParams, t, router, pathname]);

  useEffect(() => {
    let cancelled = false;
    /* Both guards are session-side facts asked of api-auth, not of this
       app's own data store. A failed check leaves the guard false, which
       only ever makes unlinking stricter. */
    const passkeyCheck = Promise.resolve()
      .then(() => authClient.passkey.listUserPasskeys())
      .then(({ data }) => (data?.length ?? 0) > 0)
      .catch(() => false);
    const passwordCheck = Promise.resolve()
      .then(() => authClient.listAccounts())
      .then(({ data }) => (data ?? []).some((account) => account.providerId === 'credential'))
      .catch(() => false);
    Promise.all([passkeyCheck, passwordCheck]).then(([passkeys, password]) => {
      if (cancelled) return;
      setHasPasskeys(passkeys);
      setHasPasswordProvider(password);
      setGuardsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const linkedProviders = providers.filter((provider) => profiles[provider.id] && !provider.accountProviderId);
  const canUnlink = linkedProviders.length > 1 || hasPasskeys || hasPasswordProvider;

  async function handleLink(provider: Provider) {
    setLoading(provider.id);
    if (provider.accountProviderId) {
      window.location.assign(`${config.authApiUrl.replace(/\/+$/, '')}/api/${provider.accountProviderId}/link`);
      return;
    }
    try {
      const linkingUrl = `${window.location.origin}/settings/linking`;
      const { error } = await authClient.linkSocial({
        provider: provider.id,
        callbackURL: linkingUrl,
        errorCallbackURL: linkingUrl,
      });
      if (error) {
        const key = `connections.error.${error.code?.toLowerCase()}`;
        toast.error(t.has(key) ? t(key) : (error.message ?? t('connections.error.unknown')));
        setLoading(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setLoading(null);
    }
  }

  async function handleUnlink(provider: Provider) {
    setLoading(provider.id);
    try {
      const accountProviderId = provider.accountProviderId ?? provider.id;
      await unlinkProvider(accountProviderId);
      for (const extra of provider.linkedAccountProviderIds ?? []) {
        await unlinkProvider(extra).catch(() => {});
      }
      const removed = new Set([accountProviderId, ...(provider.linkedAccountProviderIds ?? [])]);
      setProfiles((prev) => {
        const next = { ...prev };
        for (const row of providers) {
          if (removed.has(row.accountProviderId ?? row.id)) next[row.id] = null;
        }
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  const iconButtonClassName =
    'flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50';

  return (
    <div className="space-y-3">
      <SettingsItemGroup>
        {providers.map((provider) => {
          const profile = profiles[provider.id] ?? null;
          const isLoading = loading === provider.id;
          return (
            <LinkedSettingsItem
              key={provider.id}
              textureAvatar={provider.textureAvatar}
              providerLabel={provider.label}
              providerIcon={provider.icon}
              profile={profile}
              notLinkedDescription={t('connections.notLinked')}
              iconBackgroundColor={PROVIDER_ICON_BACKGROUND_COLORS[provider.id] ?? '#8e8e93'}
              trailing={
                profile ? (
                  <button
                    type="button"
                    aria-label={t('connections.unlink')}
                    disabled={!canUnlink || isLoading || !guardsLoaded}
                    onClick={() => setUnlinkTarget(provider)}
                    className={cn(iconButtonClassName, 'hover:bg-destructive/10 hover:text-destructive')}
                  >
                    {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Unlink className="size-4" />}
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={t('connections.link')}
                    disabled={isLoading || !guardsLoaded}
                    onClick={() => void handleLink(provider)}
                    className={iconButtonClassName}
                  >
                    {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                  </button>
                )
              }
            />
          );
        })}
      </SettingsItemGroup>
      {guardsLoaded && !canUnlink && linkedProviders.length > 0 && <p className="text-xs text-muted-foreground">{t('connections.cannotUnlink')}</p>}

      <ConfirmDialog
        open={unlinkTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
        title={t('connections.unlinkConfirm.title')}
        description={t('connections.unlinkConfirm.description', { provider: unlinkTarget?.label ?? '' })}
        confirmLabel={t('connections.unlink')}
        cancelLabel={t('connections.unlinkConfirm.cancel')}
        onConfirm={() => {
          if (unlinkTarget) void handleUnlink(unlinkTarget);
        }}
      />
    </div>
  );
}
