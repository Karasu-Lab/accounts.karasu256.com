/**
 * Regression tests for the settings initial page's server rendering.
 *
 * The reported bug: the initial page responded immediately, before the
 * account had finished loading, and the menu's profile item popped in
 * (and out) afterwards. The contract these tests pin down:
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
import { describe, expect, it, vi } from 'vitest';

const sessionUser = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };

const getSessionUserMock = vi.fn();
vi.mock('@/lib/session-user', () => ({
  getSessionUser: () => getSessionUserMock(),
}));

vi.mock('@karasu-lab/utils/server', () => ({
  getRootAppUrl: async () => 'https://app.karasu256.com/',
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('settings initial page server rendering', () => {
  it('does not finish rendering the layout until the account has loaded server-side', async () => {
    const account = deferred<typeof sessionUser>();
    getSessionUserMock.mockReturnValue(account.promise);

    let settled = false;
    const rendering = SettingsLayout({ children: <div /> }).then((element) => {
      settled = true;
      return element;
    });

    /* Flush pending microtasks: if the layout responded without
       waiting for the account, it will have settled by now. */
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false);

    account.resolve(sessionUser);
    const element = await rendering;
    expect(settled).toBe(true);
    expect((element.props as { initialUser: unknown }).initialUser).toEqual(sessionUser);
  });

  it('renders the profile item with the account name and email in the first server-rendered HTML', async () => {
    getSessionUserMock.mockResolvedValue(sessionUser);

    const element = await SettingsLayout({ children: <SettingsMenu /> });
    const html = renderToString(element);

    expect(html).toContain('Test User');
    expect(html).toContain('test@example.com');
  });
});
