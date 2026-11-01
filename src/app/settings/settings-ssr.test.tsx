/**
 * Regression tests for the settings initial page's server rendering.
 *
 * The reported bug: on https://accounts.karasu256.com/settings the
 * initial page responded immediately, before the account had finished
 * loading, and the menu's profile item popped in afterwards once the
 * client-side session loaded.
 *
 * These tests drive the real server-side chain — the settings layout,
 * the real getSessionUser(), and the real request signing — against a
 * stub of the auth API that reproduces its deployment conditions:
 *
 * - The auth API verifies any request that carries signature headers
 *   against its own INTERNAL_API_SECRET and answers 401 when the
 *   signature does not verify (its signature gate).
 * - The accounts deployment and the auth API deployment hold different
 *   values for that secret here, as in the reported environment.
 * - A plain cookie-only request (what the browser's session client
 *   sends) is accepted and returns the session.
 *
 * The contract pinned down:
 *
 * 1. The settings layout does not finish rendering until the
 *    server-side account resolution has finished — server rendering
 *    waits for the account.
 * 2. The first server-rendered HTML of the initial page already
 *    contains the profile item with the account's name and email, even
 *    though the client-side session has not loaded at that point.
 */
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sessionUser = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };

vi.mock('@karasu-lab/utils/server', async () => {
  const signature = await import('@karasu-lab/utils/server/request-signature');
  const bypass = await import('@karasu-lab/utils/server/vercel-bypass');

  class MissingEnvError extends Error {
    readonly variableName: string;
    constructor(variableName: string) {
      super(`Missing required environment variable: ${variableName}`);
      this.name = 'MissingEnvError';
      this.variableName = variableName;
    }
  }

  return {
    signRequest: signature.signRequest,
    verifyRequest: signature.verifyRequest,
    vercelProtectionBypassHeaders: bypass.vercelProtectionBypassHeaders,
    MissingEnvError,
    getRootAppUrl: async () => 'https://app.karasu256.com/',
  };
});

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ cookie: 'better-auth.session_token=test-session-token' }),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => Object.assign((key: string) => key, { has: () => false }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
  useRouter: () => ({ replace: () => {}, push: () => {}, refresh: () => {} }),
}));

/* The client-side session never resolves during server rendering. */
vi.mock('@/lib/auth/client', () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: true, refetch: async () => {} }),
    getSession: async () => ({ data: null }),
    signOut: async () => {},
  },
  getSignInUrl: (url: string) => url,
}));

vi.mock('@/lib/api/accounts', () => ({
  listAccounts: async () => ({ accounts: [] }),
  switchAccount: async () => ({ uid: 'user-1' }),
  removeAccount: async () => {},
}));

vi.mock('@/components/settings/add-account-dialog', () => ({
  AddAccountDialog: () => null,
}));

vi.mock('@/components/settings/header-account-menu', () => ({
  HeaderAccountMenu: () => null,
}));

vi.mock('@karasu-lab/ui', () => ({
  toast: { error: () => {}, success: () => {} },
  ProgressBar: () => null,
  Skeleton: () => null,
  SwitchingAccountOverlay: () => null,
}));

import SettingsLayout from './layout';
import { SettingsMenu } from '@/components/settings/settings-menu';
import { createAuthApiStub } from './settings-ssr-auth-api-stub';

/** The secret the auth API side holds; the accounts side signs with a different one (see below). */
const AUTH_API_SECRET = 'auth-api-side-secret';

const authApiStub = createAuthApiStub(AUTH_API_SECRET, sessionUser);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('settings initial page server rendering', () => {
  beforeEach(() => {
    /* The accounts deployment signs with its own value, which does not
       match the auth API's — the reported production condition. */
    vi.stubEnv('INTERNAL_API_SECRET', 'accounts-side-secret');
    vi.stubEnv('NEXT_PUBLIC_AUTH_API_URL', 'https://api-auth.karasu256.com');
    vi.stubGlobal('fetch', vi.fn(authApiStub));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does not finish rendering the layout until the account has loaded server-side', async () => {
    const gate = deferred<void>();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        await gate.promise;
        return authApiStub(url, init);
      })
    );

    let settled = false;
    const rendering = SettingsLayout({ children: <div /> }).then((element) => {
      settled = true;
      return element;
    });

    /* Flush pending work: if the layout responded without waiting for
       the account, it will have settled by now. */
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false);

    gate.resolve();
    const element = await rendering;
    expect(settled).toBe(true);
    expect((element.props as { initialUser: unknown }).initialUser).toEqual(sessionUser);
  });

  it('renders the profile item with the account name and email in the first server-rendered HTML', async () => {
    const element = await SettingsLayout({ children: <SettingsMenu /> });
    const html = renderToString(element);

    expect(html).toContain('Test User');
    expect(html).toContain('test@example.com');
  });
});
