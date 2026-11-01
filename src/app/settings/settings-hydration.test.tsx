// @vitest-environment jsdom
/**
 * Regression test for the settings initial page's profile item across
 * hydration.
 *
 * The reported bug: the profile item disappeared and reappeared around
 * page load. The server renders it from the server-resolved account,
 * so it must still be in the DOM immediately after hydration — while
 * the client-side session is still pending — and must stay there when
 * the client session takes over and when it refetches.
 */
import * as React from 'react';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sessionUser = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };

const session = vi.hoisted(() => ({
  state: { data: null as null | { user: Record<string, unknown> }, isPending: true },
}));

vi.mock('@/lib/session-user', () => ({
  getSessionUser: async () => sessionUser,
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

vi.mock('@/lib/auth/client', () => ({
  authClient: {
    useSession: () => ({ ...session.state, refetch: async () => {} }),
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

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
  container?.remove();
  container = null;
  session.state = { data: null, isPending: true };
});

describe('settings initial page profile item across hydration', () => {
  it('never leaves the DOM: server render, hydration, session takeover, and refetch', async () => {
    const element = await SettingsLayout({ children: <SettingsMenu /> });

    /* Server paint: rendered from the server-resolved account. */
    const html = renderToString(element);
    expect(html).toContain('test@example.com');

    container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    /* Hydration, while the client session is still pending. */
    await act(async () => {
      root = hydrateRoot(container!, element);
    });
    expect(container.innerHTML).toContain('test@example.com');

    /* The client session resolves and takes over. */
    session.state = {
      data: { user: { ...sessionUser, emailVerified: true, createdAt: '', updatedAt: '' } },
      isPending: false,
    };
    await act(async () => {
      root?.render(element);
    });
    expect(container.innerHTML).toContain('test@example.com');

    /* A refetch flips the client session back to pending. */
    session.state = { data: null, isPending: true };
    await act(async () => {
      root?.render(element);
    });
    expect(container.innerHTML).toContain('test@example.com');
  });
});
