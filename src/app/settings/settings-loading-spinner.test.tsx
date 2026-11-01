/**
 * @vitest-environment jsdom
 *
 * The settings screens' client-side loading presentation.
 *
 * Loading is managed through the common loading interface: providers
 * and screens report their loading under their own keys, and the
 * shell presents the aggregate as a spinner at the center of the
 * content area. The content itself always renders — loading never
 * swaps it for a skeleton. The one presentation of its own is the
 * sign-out: while it runs, the overlay shows the signing-out
 * container (the same one the auth app's sign-out page uses) instead
 * of the bare spinner.
 *
 * The contract pinned down here, for the session provider's reporting:
 *
 * 1. On the first load, with a server-resolved user already rendering
 *    the account, no spinner shows while the client session is still
 *    resolving — the server render already covers that wait.
 * 2. Once the session has resolved, any later pending period (a
 *    refetch during a client-side transition, such as switching
 *    accounts) shows the spinner, and it hides when the refetch
 *    finishes.
 * 3. Without a server-resolved user, the spinner shows during the
 *    initial load.
 * 4. In every state the page content is rendered; there is no
 *    skeleton stand-in for it.
 * 5. While the sign-out runs, the overlay presents the signing-out
 *    container rather than the bare spinner.
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

const signOutControl: { resolve: (() => void) | null } = { resolve: null };

vi.mock('@/lib/auth/client', () => ({
  authClient: {
    useSession: () => ({ ...session.state, refetch: async () => {} }),
    getSession: async () => ({ data: null }),
    signOut: () =>
      new Promise<void>((resolve) => {
        signOutControl.resolve = resolve;
      }),
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
  Spinner: () => <div data-testid="loading-spinner" />,
  LoadingView: ({ message }: { message: string }) => <div data-testid="loading-view">{message}</div>,
  SwitchingAccountOverlay: () => null,
}));

import { SettingsShell } from './shell';
import { useSettingsMenu } from '@/components/settings/settings-menu-context';

/** Stands in for a screen action: triggers the shell's sign-out. */
function SignOutTrigger() {
  const { onSignOut } = useSettingsMenu();
  return (
    <button type="button" data-testid="sign-out-trigger" onClick={() => void onSignOut()}>
      sign out
    </button>
  );
}

function spinnerVisible(container: HTMLElement) {
  return container.querySelector('[data-testid="loading-spinner"]') !== null;
}

describe('settings loading spinner', () => {
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
          <div data-testid="page-content" />
        </SettingsShell>
      );
    });
  }

  it('stays hidden for the server-covered first load, then shows during a later refetch and hides after', async () => {
    await render(sessionUser);
    expect(spinnerVisible(container)).toBe(false);
    expect(container.querySelector('[data-testid="page-content"]')).not.toBeNull();

    /* The client session resolves and takes over. */
    session.state = { data: { user: sessionUser }, isPending: false };
    await render(sessionUser);
    expect(spinnerVisible(container)).toBe(false);

    /* A client-side transition refetches the session (account switch,
       add-account completion): the spinner must show while it is in flight. */
    session.state = { data: { user: sessionUser }, isPending: true };
    await render(sessionUser);
    expect(spinnerVisible(container)).toBe(true);
    expect(container.querySelector('[data-testid="page-content"]')).not.toBeNull();

    /* The refetch finishes: the spinner hides again. */
    session.state = { data: { user: sessionUser }, isPending: false };
    await render(sessionUser);
    expect(spinnerVisible(container)).toBe(false);
  });

  it('shows during the initial load when there is no server-resolved user', async () => {
    await render(null);
    expect(spinnerVisible(container)).toBe(true);
    expect(container.querySelector('[data-testid="page-content"]')).not.toBeNull();

    session.state = { data: { user: sessionUser }, isPending: false };
    await render(null);
    expect(spinnerVisible(container)).toBe(false);
  });

  it('presents the signing-out container while the sign-out runs', async () => {
    session.state = { data: { user: sessionUser }, isPending: false };
    await act(async () => {
      root.render(
        <SettingsShell appUrl="https://app.karasu256.com/" initialUser={sessionUser}>
          <SignOutTrigger />
        </SettingsShell>
      );
    });
    expect(container.querySelector('[data-testid="loading-view"]')).toBeNull();

    const trigger = container.querySelector('[data-testid="sign-out-trigger"]');
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    /* The sign-out is in flight (its request unresolved): the overlay
       shows the signing-out container, not the bare spinner. */
    const view = container.querySelector('[data-testid="loading-view"]');
    expect(view).not.toBeNull();
    expect(view?.textContent).toBe('settings.signingOut');
    expect(spinnerVisible(container)).toBe(false);
  });
});
