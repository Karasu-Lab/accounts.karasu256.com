/**
 * @vitest-environment jsdom
 *
 * Regression test for the settings header's progress bar.
 *
 * The bar (attached to the header's bottom edge) is the indicator for
 * client-side transitions: it is shown while the client session is
 * loading — above all while a refetch is in flight, as happens when
 * switching accounts or completing an added account — and hidden once
 * loading finishes.
 *
 * It was lost when the account started being resolved server-side:
 * the bar's visibility was tied to an "initial loading" flag that is
 * permanently false once a server-resolved user exists, so the bar
 * never appeared again, even during later client-side loading.
 *
 * The contract pinned down here:
 *
 * 1. On the first load, with a server-resolved user already rendering
 *    the account, the bar stays hidden while the client session is
 *    still resolving — the server render already covers that wait.
 * 2. Once the session has resolved, any later pending period (a
 *    refetch during a client-side transition) shows the bar again,
 *    and it hides when the refetch finishes.
 * 3. Without a server-resolved user, the bar shows during the initial
 *    load, as it did before server-side resolution existed.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sessionUser = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };

const session: { state: { data: unknown; isPending: boolean } } = {
  state: { data: null, isPending: true },
};

vi.mock('next-intl', () => ({
  useTranslations: () => Object.assign((key: string) => key, { has: () => false }),
}));

const routerStub = { replace: () => {}, push: () => {}, refresh: () => {} };

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
  useRouter: () => routerStub,
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
  ProgressBar: () => <div data-testid="progress-bar" />,
  Skeleton: () => null,
  SwitchingAccountOverlay: () => null,
}));

import { SettingsShell } from './shell';

function progressBarState(container: HTMLElement) {
  const bar = container.querySelector('[data-testid="progress-bar"]');
  const wrapper = bar?.parentElement?.parentElement;
  return {
    present: bar !== null,
    visible: wrapper?.className.includes('opacity-100') ?? false,
    ariaHidden: wrapper?.getAttribute('aria-hidden'),
  };
}

describe('settings header progress bar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    session.state = { data: null, isPending: true };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function render(initialUser: typeof sessionUser | null) {
    await act(async () => {
      root.render(
        <SettingsShell appUrl="https://app.karasu256.com/" initialUser={initialUser}>
          <div />
        </SettingsShell>
      );
    });
  }

  it('stays hidden for the server-covered first load, then shows during a later refetch and hides after', async () => {
    await render(sessionUser);
    expect(progressBarState(container)).toMatchObject({ present: true, visible: false, ariaHidden: 'true' });

    /* The client session resolves and takes over. */
    session.state = { data: { user: sessionUser }, isPending: false };
    await render(sessionUser);
    expect(progressBarState(container)).toMatchObject({ visible: false, ariaHidden: 'true' });

    /* A client-side transition refetches the session (account switch,
       add-account completion): the bar must show while it is in flight. */
    session.state = { data: { user: sessionUser }, isPending: true };
    await render(sessionUser);
    expect(progressBarState(container)).toMatchObject({ visible: true, ariaHidden: 'false' });

    /* The refetch finishes: the bar hides again. */
    session.state = { data: { user: sessionUser }, isPending: false };
    await render(sessionUser);
    expect(progressBarState(container)).toMatchObject({ visible: false, ariaHidden: 'true' });
  });

  it('shows during the initial load when there is no server-resolved user', async () => {
    await render(null);
    expect(progressBarState(container)).toMatchObject({ present: true, visible: true, ariaHidden: 'false' });

    session.state = { data: { user: sessionUser }, isPending: false };
    await render(null);
    expect(progressBarState(container)).toMatchObject({ visible: false, ariaHidden: 'true' });
  });
});
