'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, Circle, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Spinner as DefaultSpinner } from '@Hashibutogarasu/ui';
import { useOAuthErrorMessage } from '@/lib/i18n/use-oauth-error-message';
import { Button, Dialog, DialogBackdrop, DialogClose, DialogPopup, DialogPortal, DialogTitle, Input, Label } from '@Hashibutogarasu/ui';
import type { OAuthClientSummary } from '@/lib/api/developer';

const STEP_LABELS = ['authorize', 'access_token', 'profile_read', 'profile_write'] as const;
type StepLabel = (typeof STEP_LABELS)[number];
type StepStatus = 'waiting' | 'running' | 'success' | 'error';

interface StepState {
  label: StepLabel;
  status: StepStatus;
  data?: Record<string, unknown>;
  error?: string;
}

interface OAuthClientTestDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  client: OAuthClientSummary;
  resourceServerUrl: string;
  /** Overrides the default spinner shown while a step is in progress. */
  spinner?: React.ComponentType<{ className?: string }>;
}

function makeInitialSteps(): StepState[] {
  return STEP_LABELS.map((label) => ({ label, status: 'waiting' }));
}

function failStep(label: StepLabel, error: string) {
  return (prev: StepState[]): StepState[] => prev.map((s) => (s.label === label ? { ...s, status: 'error', error } : s));
}

function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(digest) };
}

/**
 * Dialog that tests the full OAuth flow for the given client by opening this
 * app's real authorization page in a popup window, exchanging the resulting
 * code at its `/oauth2/token` endpoint (PKCE required), then calling the
 * resource server's `/api/profile` for read and write.
 */
export function OAuthClientTestDialog({
  open,
  onOpenChange,
  client,
  resourceServerUrl,
  spinner: SpinnerComponent = DefaultSpinner,
}: OAuthClientTestDialogProps) {
  const t = useTranslations();
  const resourceServerUrlRef = useRef(resourceServerUrl);
  const [steps, setSteps] = useState<StepState[]>(makeInitialSteps);
  const [secret, setSecret] = useState('');
  const popupRef = useRef<Window | null>(null);
  const clientRef = useRef(client);
  const secretRef = useRef(secret);
  const verifierRef = useRef('');

  useEffect(() => {
    clientRef.current = client;
  }, [client]);
  useEffect(() => {
    secretRef.current = secret;
  }, [secret]);
  useEffect(() => {
    resourceServerUrlRef.current = resourceServerUrl;
  }, [resourceServerUrl]);

  const isRunning = steps.some((s) => s.status === 'running');
  const isWaitingForCode = steps[0].status === 'running';
  const hasStarted = steps.some((s) => s.status !== 'waiting');
  const allPassed = hasStarted && !isRunning && steps.every((s) => s.status === 'success');

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || (event.data as Record<string, unknown>).type !== 'oauth_test_callback') return;

      const { code, error } = event.data as { type: string; code?: string; error?: string };

      if (error || !code) {
        setSteps(failStep('authorize', error ?? 'access_denied'));
        return;
      }

      setSteps((prev) =>
        prev.map((s) => {
          if (s.label === 'authorize') return { ...s, status: 'success' };
          if (s.label === 'access_token') return { ...s, status: 'running' };
          return s;
        })
      );

      void (async () => {
        try {
          const currentClient = clientRef.current;
          const redirectUri = currentClient.redirect_uris[0] ?? '';

          const tokenRes = await fetch('/api/auth/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              client_id: currentClient.client_id,
              client_secret: secretRef.current,
              redirect_uri: redirectUri,
              code_verifier: verifierRef.current,
              resource: `${window.location.origin}/api/auth`,
            }).toString(),
          });

          if (!tokenRes.ok) {
            const body = (await tokenRes.json().catch(() => ({}))) as { error?: string };
            setSteps(failStep('access_token', body.error ?? 'invalid_grant'));
            return;
          }

          const { access_token: accessToken, expires_in: expiresIn } = (await tokenRes.json()) as {
            access_token: string;
            expires_in: number;
          };

          setSteps((prev) =>
            prev.map((s) => {
              if (s.label === 'access_token')
                return {
                  ...s,
                  status: 'success',
                  data: { token: accessToken.slice(0, 12) + '…', expires_in: expiresIn },
                };
              if (s.label === 'profile_read') return { ...s, status: 'running' };
              return s;
            })
          );

          const bearerHeader = { Authorization: `Bearer ${accessToken}` };

          const profileUrl = `${resourceServerUrlRef.current}/api/profile`;
          const profileRes = await fetch(profileUrl, { headers: bearerHeader });
          if (!profileRes.ok) {
            const body = (await profileRes.json().catch(() => ({}))) as { error?: string };
            setSteps(failStep('profile_read', body.error ?? 'token_verification_failed'));
            return;
          }

          const profile = (await profileRes.json()) as { id: string; name: string | null };
          setSteps((prev) =>
            prev.map((s) => {
              if (s.label === 'profile_read') return { ...s, status: 'success', data: { id: profile.id, name: profile.name ?? null } };
              if (s.label === 'profile_write') return { ...s, status: 'running' };
              return s;
            })
          );

          const writeRes = await fetch(profileUrl, {
            method: 'PATCH',
            headers: { ...bearerHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: profile.name }),
          });
          if (!writeRes.ok) {
            const body = (await writeRes.json().catch(() => ({}))) as { error?: string };
            setSteps(failStep('profile_write', body.error ?? 'token_verification_failed'));
            return;
          }

          const updated = (await writeRes.json()) as { id: string; name: string | null };
          setSteps((prev) =>
            prev.map((s) => (s.label === 'profile_write' ? { ...s, status: 'success', data: { id: updated.id, name: updated.name ?? null } } : s))
          );
        } catch {
          setSteps((prev) => prev.map((s) => (s.status === 'running' ? { ...s, status: 'error', error: 'network_error' } : s)));
        }
      })();
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!isWaitingForCode) return;

    const interval = setInterval(() => {
      if (!popupRef.current?.closed) return;
      setSteps((prev) => {
        if (prev[0].status !== 'running') return prev;
        return prev.map((s) => (s.label === 'authorize' ? { ...s, status: 'error', error: t('settings.developer.test.popupClosed') } : s));
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isWaitingForCode, t]);

  async function startTest() {
    const redirectUri = client.redirect_uris[0];
    if (!redirectUri) {
      setSteps((prev) =>
        prev.map((s) => (s.label === 'authorize' ? { ...s, status: 'error', error: t('settings.developer.test.noCallbackUri') } : s))
      );
      return;
    }

    setSteps(makeInitialSteps().map((s) => (s.label === 'authorize' ? { ...s, status: 'running' } : s)));

    const { verifier, challenge } = await createPkcePair();
    verifierRef.current = verifier;

    const url =
      '/api/auth/oauth2/authorize?' +
      new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: client.scope ?? '',
        state: crypto.randomUUID(),
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }).toString();

    const popup = window.open(url, 'oauth_test', 'popup=yes,width=520,height=640');
    if (!popup) {
      setSteps((prev) =>
        prev.map((s) => (s.label === 'authorize' ? { ...s, status: 'error', error: t('settings.developer.test.popupBlocked') } : s))
      );
      return;
    }
    popupRef.current = popup;
  }

  function cancelTest() {
    popupRef.current?.close();
    popupRef.current = null;
    setSteps(makeInitialSteps());
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      popupRef.current?.close();
      popupRef.current = null;
      setSteps(makeInitialSteps());
      setSecret('');
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md w-full p-6 space-y-4">
          <DialogTitle>{t('settings.developer.test.title', { name: client.client_name ?? client.client_id })}</DialogTitle>

          <div className="space-y-1.5">
            <Label htmlFor="oauth-test-secret">{t('settings.developer.test.clientSecret')}</Label>
            <Input
              id="oauth-test-secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              disabled={isRunning}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            {steps.map((step) => (
              <StepRow key={step.label} step={step} spinner={SpinnerComponent} />
            ))}
            {allPassed && <p className="text-sm text-green-600 dark:text-green-400 font-medium pt-1">{t('settings.developer.test.allPassed')}</p>}
          </div>

          <div className="flex justify-end gap-2">
            {isWaitingForCode ? (
              <Button variant="ghost" onClick={cancelTest}>
                {t('settings.developer.dialog.cancel')}
              </Button>
            ) : (
              <DialogClose render={<Button variant="ghost">{t('settings.developer.dialog.done')}</Button>} />
            )}
            <Button onClick={() => void startTest()} disabled={isRunning || !secret.trim()}>
              {hasStarted && !isRunning ? t('settings.developer.test.runAgain') : t('settings.developer.test.run')}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

function StepIcon({ status, spinner: SpinnerComponent }: { status: StepStatus; spinner: React.ComponentType<{ className?: string }> }) {
  switch (status) {
    case 'waiting':
      return <Circle className="size-4 text-muted-foreground" />;
    case 'running':
      return <SpinnerComponent className="size-4 text-orange-500" />;
    case 'success':
      return <CheckCircle className="size-4 text-green-600 dark:text-green-400" />;
    case 'error':
      return <XCircle className="size-4 text-destructive" />;
  }
}

function StepRow({ step, spinner }: { step: StepState; spinner: React.ComponentType<{ className?: string }> }) {
  const t = useTranslations();
  const getErrorMessage = useOAuthErrorMessage();
  const labelKey = `settings.developer.test.steps.${step.label}`;

  return (
    <div className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5">
      <span className="mt-0.5 shrink-0">
        <StepIcon status={step.status} spinner={spinner} />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{t.has(labelKey) ? t(labelKey) : step.label}</p>
        {step.status === 'success' && step.data && (
          <div className="space-y-0.5">
            {Object.entries(step.data).map(([k, v]) => (
              <p key={k} className="text-xs text-muted-foreground font-mono truncate">
                {k}: {String(v)}
              </p>
            ))}
          </div>
        )}
        {step.status === 'error' && step.error && <p className="text-xs text-destructive">{getErrorMessage(step.error)}</p>}
      </div>
    </div>
  );
}
