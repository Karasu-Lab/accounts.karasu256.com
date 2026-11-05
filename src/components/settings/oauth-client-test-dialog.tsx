'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Circle, Copy, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Spinner as DefaultSpinner, toast } from '@karasu-lab/ui';
import { useOAuthErrorMessage } from '@/lib/i18n/use-oauth-error-message';
import { useAuthClient } from '@/lib/auth/client';
import { Button, Dialog, DialogBackdrop, DialogClose, DialogPopup, DialogPortal, DialogTitle, Input, Label } from '@karasu-lab/ui';
import { DEVICE_CODE_GRANT_TYPE, oauthClientType, type OAuthClientSummary } from '@/lib/api/developer';

const WEB_STEP_LABELS = ['authorize', 'access_token'] as const;
const DEVICE_STEP_LABELS = ['device_code', 'access_token'] as const;
type StepLabel = 'authorize' | 'device_code' | 'access_token';
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
  /** Overrides the default spinner shown while a step is in progress. */
  spinner?: React.ComponentType<{ className?: string }>;
}

function makeInitialSteps(isDevice: boolean): StepState[] {
  return (isDevice ? DEVICE_STEP_LABELS : WEB_STEP_LABELS).map((label) => ({ label, status: 'waiting' }));
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

/** The auth API's origin, trailing slash removed, which hosts the authorization server this test runs against. */
function authApiBase(authApiUrl: string): string {
  return authApiUrl.replace(/\/$/, '');
}

/**
 * Encodes the client credentials as an HTTP Basic header value,
 * form-url-encoding each part before joining, per RFC 6749 §2.3.1.
 * Clients registered through the developer settings use
 * `client_secret_basic`, and the token endpoint rejects any other
 * authentication method for them with `invalid_client`.
 */
function basicAuthorization(clientId: string, clientSecret: string): string {
  const encodePart = (value: string) => new URLSearchParams({ v: value }).toString().slice(2);
  return `Basic ${btoa(`${encodePart(clientId)}:${encodePart(clientSecret)}`)}`;
}

/**
 * Dialog that tests the authorization flow for the given client. Web
 * clients run the authorization code flow: the auth app's real
 * authorization page opens in a popup window and the resulting code is
 * exchanged at the auth API's `/oauth2/token` endpoint (PKCE required,
 * with `client_secret_basic` client authentication). Device clients
 * have no secret, so they run the device authorization flow instead —
 * the same intermediate authorization the MCP server uses: a device
 * code is requested from `/device/code`, the user approves it on the
 * auth app's device page, and the dialog polls `/oauth2/token` until
 * the token is issued. The requested permissions are checked and
 * granted on the auth app's consent screen as part of the real
 * authorization — this dialog no longer performs a separate
 * permission check against a resource server. Every run also writes a
 * debug log into the result field under the steps, copyable with the
 * copy button, because the translated step errors alone do not say
 * what actually happened.
 */
export function OAuthClientTestDialog({
  open,
  onOpenChange,
  client,
  spinner: SpinnerComponent = DefaultSpinner,
}: OAuthClientTestDialogProps) {
  const { config } = useAuthClient();
  const t = useTranslations();
  const isDevice = oauthClientType(client) === 'device';
  const [steps, setSteps] = useState<StepState[]>(() => makeInitialSteps(isDevice));
  const [secret, setSecret] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<{ userCode: string; verificationUrl: string } | null>(null);
  const [resultLog, setResultLog] = useState('');
  const popupRef = useRef<Window | null>(null);
  const clientRef = useRef(client);
  const secretRef = useRef(secret);
  const verifierRef = useRef('');
  const runIdRef = useRef(0);

  useEffect(() => {
    clientRef.current = client;
  }, [client]);
  useEffect(() => {
    if (!open) return;
    setSteps(makeInitialSteps(isDevice));
    setDeviceInfo(null);
  }, [open, isDevice]);
  useEffect(() => {
    secretRef.current = secret;
  }, [secret]);

  const isRunning = steps.some((s) => s.status === 'running');
  const isWaitingForCode = steps[0].status === 'running';
  const hasStarted = steps.some((s) => s.status !== 'waiting');
  const allPassed = hasStarted && !isRunning && steps.every((s) => s.status === 'success');

  /**
   * Appends one timestamped line to the debug log shown in the result
   * field. The translated step errors alone do not say what happened —
   * the log keeps the raw details (endpoints, HTTP status, and the
   * server's error response including its error_description) so a
   * failure can be diagnosed and copied out with the copy button. The
   * client secret and the authorization code itself are never logged.
   */
  const appendLog = useCallback((line: string) => {
    setResultLog((prev) => `${prev}${prev ? '\n' : ''}[${new Date().toLocaleTimeString()}] ${line}`);
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || (event.data as Record<string, unknown>).type !== 'oauth_test_callback') return;

      const { code, error, errorDescription } = event.data as { type: string; code?: string; error?: string; errorDescription?: string };

      if (error || !code) {
        appendLog(`callback: error=${error ?? 'access_denied'}${errorDescription ? ` (${errorDescription})` : ''}`);
        setSteps(failStep('authorize', error ?? 'access_denied'));
        return;
      }
      appendLog(`callback: authorization code received (${code.length} characters)`);

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

          appendLog(
            `token request: POST ${authApiBase(config.authApiUrl)}/api/auth/oauth2/token (grant_type=authorization_code, client authentication: client_secret_basic, PKCE S256, resource=${authApiBase(config.authApiUrl)}/api/auth/oauth2/userinfo)`
          );
          const tokenRes = await fetch(`${authApiBase(config.authApiUrl)}/api/auth/oauth2/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: basicAuthorization(currentClient.client_id, secretRef.current),
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: redirectUri,
              code_verifier: verifierRef.current,
              // The token's resource is the authorization server's own
              // userinfo resource, which the server implicitly accepts.
              // Accounts' own /api/auth is not a configured resource —
              // the authorization part belongs to auth, and the server
              // rejects an accounts resource with invalid_target.
              resource: `${authApiBase(config.authApiUrl)}/api/auth/oauth2/userinfo`,
            }).toString(),
          });

          if (!tokenRes.ok) {
            const body = (await tokenRes.json().catch(() => ({}))) as { error?: string; error_description?: string };
            appendLog(`token response: HTTP ${tokenRes.status} ${JSON.stringify(body)}`);
            setSteps(failStep('access_token', body.error ?? 'invalid_grant'));
            return;
          }

          const { access_token: accessToken, expires_in: expiresIn } = (await tokenRes.json()) as {
            access_token: string;
            expires_in: number;
          };
          appendLog(`token response: HTTP ${tokenRes.status} (access token issued, expires_in=${expiresIn})`);

          setSteps((prev) =>
            prev.map((s) =>
              s.label === 'access_token'
                ? {
                    ...s,
                    status: 'success',
                    data: { token: accessToken.slice(0, 12) + '…', expires_in: expiresIn },
                  }
                : s
            )
          );
        } catch {
          appendLog('token request failed: network error');
          setSteps((prev) => prev.map((s) => (s.status === 'running' ? { ...s, status: 'error', error: 'network_error' } : s)));
        }
      })();
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [appendLog]);

  useEffect(() => {
    if (isDevice || !isWaitingForCode) return;

    const interval = setInterval(() => {
      if (!popupRef.current?.closed) return;
      appendLog('authorize: popup closed before the callback arrived');
      setSteps((prev) => {
        if (prev[0].status !== 'running') return prev;
        return prev.map((s) => (s.label === 'authorize' ? { ...s, status: 'error', error: t('settings.developer.test.popupClosed') } : s));
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isDevice, isWaitingForCode, t, appendLog]);

  /**
   * Polls the token endpoint with the device code until the user
   * approves on the device page and the token is issued, following the
   * authorization_pending / slow_down protocol. The run id guards
   * against a cancelled or superseded run writing into a later one.
   * The device code itself is never logged.
   */
  async function pollDeviceToken(runId: number, deviceCode: string, intervalSeconds: number) {
    let interval = intervalSeconds;
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      if (runIdRef.current !== runId) return;

      let tokenRes: Response;
      try {
        tokenRes = await fetch(`${authApiBase(config.authApiUrl)}/api/auth/oauth2/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: DEVICE_CODE_GRANT_TYPE,
            device_code: deviceCode,
            client_id: clientRef.current.client_id,
          }).toString(),
        });
      } catch {
        appendLog('token request failed: network error');
        setSteps(failStep('access_token', 'network_error'));
        return;
      }

      const body = (await tokenRes.json().catch(() => ({}))) as {
        access_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
      };

      if (tokenRes.ok && body.access_token) {
        appendLog(`token response: HTTP ${tokenRes.status} (access token issued, expires_in=${body.expires_in})`);
        setSteps((prev) =>
          prev.map((s) =>
            s.label === 'access_token'
              ? { ...s, status: 'success', data: { token: body.access_token!.slice(0, 12) + '…', expires_in: body.expires_in } }
              : s
          )
        );
        return;
      }

      const error = body.error ?? 'invalid_grant';
      if (error === 'authorization_pending') continue;
      appendLog(`token response: HTTP ${tokenRes.status} ${JSON.stringify(body)}`);
      if (error === 'slow_down') {
        interval += 5;
        continue;
      }
      setSteps(failStep('access_token', error));
      return;
    }
  }

  async function startDeviceTest() {
    runIdRef.current += 1;
    const runId = runIdRef.current;
    setResultLog('');
    setDeviceInfo(null);
    appendLog(`test started: client_id=${client.client_id}, scope=${client.scope ?? ''}`);
    setSteps(makeInitialSteps(true).map((s) => (s.label === 'device_code' ? { ...s, status: 'running' } : s)));

    let codeRes: Response;
    try {
      appendLog(`device code request: POST ${authApiBase(config.authApiUrl)}/api/auth/device/code`);
      codeRes = await fetch(`${authApiBase(config.authApiUrl)}/api/auth/device/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.client_id, ...(client.scope ? { scope: client.scope } : {}) }),
      });
    } catch {
      appendLog('device code request failed: network error');
      setSteps(failStep('device_code', 'network_error'));
      return;
    }

    const body = (await codeRes.json().catch(() => ({}))) as {
      device_code?: string;
      user_code?: string;
      verification_uri?: string;
      verification_uri_complete?: string;
      expires_in?: number;
      interval?: number;
      error?: string;
    };

    if (!codeRes.ok || !body.device_code || !body.user_code) {
      appendLog(`device code response: HTTP ${codeRes.status} ${JSON.stringify(body)}`);
      setSteps(failStep('device_code', body.error ?? 'invalid_client'));
      return;
    }

    const verificationUrl = body.verification_uri_complete ?? body.verification_uri ?? '';
    appendLog(`device code issued: user_code=${body.user_code}, expires_in=${body.expires_in}`);
    setDeviceInfo({ userCode: body.user_code, verificationUrl });
    setSteps((prev) =>
      prev.map((s) => {
        if (s.label === 'device_code') return { ...s, status: 'success', data: { user_code: body.user_code } };
        if (s.label === 'access_token') return { ...s, status: 'running' };
        return s;
      })
    );

    if (verificationUrl) {
      const popup = window.open(verificationUrl, 'oauth_test', 'popup=yes,width=520,height=640');
      if (popup) {
        popupRef.current = popup;
      } else {
        appendLog('device page: the popup was blocked by the browser');
      }
    }

    void pollDeviceToken(runId, body.device_code, body.interval ?? 5);
  }

  async function startTest() {
    if (isDevice) {
      await startDeviceTest();
      return;
    }
    setResultLog('');
    const redirectUri = client.redirect_uris[0];
    if (!redirectUri) {
      appendLog('authorize: no callback URI is registered for this client');
      setSteps((prev) =>
        prev.map((s) => (s.label === 'authorize' ? { ...s, status: 'error', error: t('settings.developer.test.noCallbackUri') } : s))
      );
      return;
    }

    appendLog(`test started: client_id=${client.client_id}, scope=${client.scope ?? ''}`);
    setSteps(makeInitialSteps(false).map((s) => (s.label === 'authorize' ? { ...s, status: 'running' } : s)));

    const { verifier, challenge } = await createPkcePair();
    verifierRef.current = verifier;

    const url =
      `${authApiBase(config.authApiUrl)}/api/auth/oauth2/authorize?` +
      new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: client.scope ?? '',
        state: crypto.randomUUID(),
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }).toString();

    appendLog(`authorize request: GET ${url}`);
    const popup = window.open(url, 'oauth_test', 'popup=yes,width=520,height=640');
    if (!popup) {
      appendLog('authorize: the popup was blocked by the browser');
      setSteps((prev) =>
        prev.map((s) => (s.label === 'authorize' ? { ...s, status: 'error', error: t('settings.developer.test.popupBlocked') } : s))
      );
      return;
    }
    popupRef.current = popup;
  }

  function cancelTest() {
    runIdRef.current += 1;
    popupRef.current?.close();
    popupRef.current = null;
    setSteps(makeInitialSteps(isDevice));
    setDeviceInfo(null);
    setResultLog('');
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      runIdRef.current += 1;
      popupRef.current?.close();
      popupRef.current = null;
      setSteps(makeInitialSteps(isDevice));
      setSecret('');
      setDeviceInfo(null);
      setResultLog('');
    }
    onOpenChange(next);
  }

  async function copyResult() {
    await navigator.clipboard.writeText(resultLog);
    toast.success(t('settings.developer.test.resultCopied'));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md w-full p-6 space-y-4">
          <DialogTitle>{t('settings.developer.test.title', { name: client.client_name ?? client.client_id })}</DialogTitle>

          {!isDevice && (
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
          )}

          {isDevice && deviceInfo && (
            <div className="space-y-1.5">
              <Label>{t('settings.developer.test.userCode')}</Label>
              <p className="font-mono text-lg tracking-widest">{deviceInfo.userCode}</p>
              {deviceInfo.verificationUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const popup = window.open(deviceInfo.verificationUrl, 'oauth_test', 'popup=yes,width=520,height=640');
                    if (popup) popupRef.current = popup;
                  }}
                >
                  {t('settings.developer.test.openDevicePage')}
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            {steps.map((step) => (
              <StepRow key={step.label} step={step} spinner={SpinnerComponent} />
            ))}
            {allPassed && <p className="text-sm text-green-600 dark:text-green-400 font-medium pt-1">{t('settings.developer.test.allPassed')}</p>}
          </div>

          {hasStarted && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="oauth-test-result">{t('settings.developer.test.result')}</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => void copyResult()} disabled={!resultLog}>
                  <Copy className="size-4" />
                  {t('settings.developer.test.copyResult')}
                </Button>
              </div>
              <textarea
                id="oauth-test-result"
                readOnly
                value={resultLog}
                rows={8}
                className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs leading-relaxed"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            {isWaitingForCode || (isDevice && isRunning) ? (
              <Button variant="ghost" onClick={cancelTest}>
                {t('settings.developer.dialog.cancel')}
              </Button>
            ) : (
              <DialogClose render={<Button variant="ghost">{t('settings.developer.dialog.done')}</Button>} />
            )}
            <Button onClick={() => void startTest()} disabled={isRunning || (!isDevice && !secret.trim())}>
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
