'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Link2, Unlink } from 'lucide-react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useTranslations } from 'next-intl';
import { toast, ConfirmDialog } from '@karasu-lab/ui';
import { unlinkProvider } from '@karasu-lab/utils/client';
import { useAuthClient } from '@/lib/auth/client';
import { useSessionSource } from '@/components/session-source-provider';
import type { ProviderProfile } from '@/lib/auth/provider-profile';
import { SettingsItemGroup, SettingsItemIconButton } from '@/components/settings/settings-item-container';
import { useReportLoading } from '@/components/settings/loading-context';
import { LinkedSettingsItem } from '@/components/auth/settings/linked-settings-item';

export interface Provider {
  id: string;
  label: string;
  icon: IconDefinition;
  textureAvatar?: boolean;
  accountProviderId?: string;
  linkedAccountProviderIds?: string[];
  disabled?: boolean;
}

interface ProviderSectionProps {
  providers: Provider[];
  initialProfiles: Record<string, ProviderProfile | null>;
  profilesLoaded: boolean;
}

const PROVIDER_ICON_BACKGROUND_COLORS: Record<string, string> = {
  google: '#4285f4',
  github: '#24292f',
  microsoft: '#00adef',
  xbox: '#107c10',
  minecraft: '#6a9c3f',
};

export function ProviderSection({ providers, initialProfiles, profilesLoaded }: ProviderSectionProps) {
  const { authClient, config } = useAuthClient();
  const { providerId: sessionProviderId } = useSessionSource();
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<Record<string, ProviderProfile | null>>(initialProfiles);

  useEffect(() => {
    setProfiles(initialProfiles);
  }, [initialProfiles]);
  const [loading, setLoading] = useState<string | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<Provider | null>(null);
  const [hasPasskeys, setHasPasskeys] = useState(false);
  const [hasPasswordProvider, setHasPasswordProvider] = useState(false);
  const [guardsLoaded, setGuardsLoaded] = useState(false);
  useReportLoading('linking-guards', !guardsLoaded);
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
  const currentSessionProviderLinked = providers.some((provider) => profiles[provider.id] && isCurrentSessionProvider(provider));

  function isCurrentSessionProvider(provider: Provider): boolean {
    return sessionProviderId !== null && (provider.accountProviderId ?? provider.id) === sessionProviderId;
  }

  async function handleLink(provider: Provider) {
    if (provider.disabled) return;
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
    if (provider.disabled) return;
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

  return (
    <div className="space-y-3">
      <SettingsItemGroup>
        {providers.map((provider) => {
          const profile = profiles[provider.id] ?? null;
          const resolved = profilesLoaded || provider.id in profiles;
          const isLoading = loading === provider.id;
          return (
            <LinkedSettingsItem
              key={provider.id}
              textureAvatar={provider.textureAvatar}
              providerLabel={provider.label}
              providerIcon={provider.icon}
              profile={profile}
              disabled={provider.disabled}
              notLinkedDescription={t('connections.notLinked')}
              iconBackgroundColor={PROVIDER_ICON_BACKGROUND_COLORS[provider.id] ?? '#8e8e93'}
              trailing={
                !resolved ? null : profile ? (
                  <SettingsItemIconButton
                    label={t('connections.unlink')}
                    icon={Unlink}
                    loading={isLoading}
                    disabled={provider.disabled || !canUnlink || !guardsLoaded || isCurrentSessionProvider(provider)}
                    onClick={() => setUnlinkTarget(provider)}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  />
                ) : provider.disabled || !guardsLoaded ? null : (
                  <SettingsItemIconButton
                    label={t('connections.link')}
                    icon={Link2}
                    loading={isLoading}
                    onClick={() => void handleLink(provider)}
                  />
                )
              }
            />
          );
        })}
      </SettingsItemGroup>
      {guardsLoaded && !canUnlink && linkedProviders.length > 0 && <p className="text-xs text-muted-foreground">{t('connections.cannotUnlink')}</p>}
      {currentSessionProviderLinked && <p className="text-xs text-muted-foreground">{t('connections.cannotUnlinkCurrentSession')}</p>}

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
