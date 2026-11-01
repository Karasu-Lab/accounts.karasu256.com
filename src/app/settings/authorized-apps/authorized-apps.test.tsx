/**
 * @vitest-environment jsdom
 *
 * The authorized apps screen, rebuilt on settings item containers.
 *
 * The contract pinned down here:
 *
 * 1. Each authorized app renders as one settings item in a settings
 *    item group (joined items, no accordion), titled with the app's
 *    name and described with its authorization date.
 * 2. Selecting an item opens the app's information dialog with its
 *    client ID and approved permissions; the revoke control there
 *    hands over to the revoke confirmation, and confirming removes
 *    the app from the list.
 * 3. Loading, failed, and loaded-but-empty are distinct states: a
 *    failed load shows an error with a retry — never the empty text.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apps = [
  { id: 'consent-1', clientId: 'client-one', clientName: 'One App', scopes: ['openid', 'read:profile'], createdAt: '2026-01-02T00:00:00.000Z' },
  { id: 'consent-2', clientId: 'client-two', scopes: [], createdAt: '2026-02-03T00:00:00.000Z' },
];

const api: { list: () => Promise<unknown[]>; revokeCalls: string[] } = {
  list: async () => apps,
  revokeCalls: [],
};

vi.mock('next-intl', () => ({
  useTranslations: () =>
    Object.assign((key: string) => key, {
      has: (key: string) => key.startsWith('authorizedApps.scopes.'),
    }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/authorized-apps',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/api/authorized-apps', () => ({
  listAuthorizedApps: () => api.list(),
  revokeAuthorizedApp: async (_auth: unknown, id: string) => {
    api.revokeCalls.push(id);
  },
}));

vi.mock('@/lib/auth/client', () => ({
  useAuthClient: () => ({
    authClient: {},
    bridgeFirebaseSession: async () => {},
    config: { authApiUrl: 'https://api-auth.karasu256.com', authUrl: 'https://auth.karasu256.com' },
  }),
}));

vi.mock('@/components/ui/loading-button', () => ({
  LoadingButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@karasu-lab/ui', () => ({
  Button: ({ children, onClick, disabled, ...rest }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
  ConfirmDialog: ({ open, onConfirm, confirmLabel }: { open: boolean; onConfirm: () => void; confirmLabel: string }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <button type="button" onClick={() => void onConfirm()}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div data-testid="info-dialog">{children}</div> : null),
  DialogPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogBackdrop: () => null,
  DialogPopup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ render }: { render: React.ReactElement }) => render,
  toast: { success: () => {}, error: () => {} },
}));

import { AuthorizedAppsClient } from './client';

describe('authorized apps screen', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    api.list = async () => apps;
    api.revokeCalls = [];
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

  async function render() {
    await act(async () => {
      root.render(<AuthorizedAppsClient />);
    });
  }

  function items() {
    return container.querySelectorAll('[data-slot="settings-item-container"]');
  }

  function buttonByText(text: string) {
    return Array.from(container.querySelectorAll('button')).find((b) => b.textContent === text);
  }

  it('renders one joined settings item per authorized app, with the authorization date as the description', async () => {
    await render();
    expect(items()).toHaveLength(2);
    expect(container.textContent).toContain('One App');
    expect(container.textContent).toContain('client-two');
    expect(container.textContent).toContain('authorizedApps.authorizedAt');
    /* The second item is joined to the first: it drops its top rounding. */
    expect(items()[1].className).toContain('rounded-t-none');
  });

  it('opens the information dialog from an item and revokes through the confirmation', async () => {
    await render();
    const firstButton = items()[0].querySelector('button');
    await act(async () => {
      firstButton?.click();
    });
    const dialog = container.querySelector('[data-testid="info-dialog"]');
    expect(dialog?.textContent).toContain('client-one');
    expect(dialog?.textContent).toContain('authorizedApps.scopes.read:profile');

    await act(async () => {
      buttonByText('authorizedApps.revoke')?.click();
    });
    expect(container.querySelector('[data-testid="confirm-dialog"]')).not.toBeNull();

    await act(async () => {
      buttonByText('authorizedApps.revokeConfirm.confirm')?.click();
    });
    expect(api.revokeCalls).toEqual(['consent-1']);
    expect(items()).toHaveLength(1);
    expect(container.textContent).not.toContain('One App');
  });

  it('shows the empty text only when the load succeeds with no apps', async () => {
    api.list = async () => [];
    await render();
    expect(items()).toHaveLength(0);
    expect(container.textContent).toContain('authorizedApps.empty');
    expect(container.textContent).not.toContain('authorizedApps.loadError');
  });

  it('shows an error with a retry when the load fails, never the empty text', async () => {
    let attempts = 0;
    api.list = async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('boom');
      return apps;
    };
    await render();
    expect(container.textContent).toContain('authorizedApps.loadError');
    expect(container.textContent).not.toContain('authorizedApps.empty');

    await act(async () => {
      buttonByText('authorizedApps.retry')?.click();
    });
    expect(items()).toHaveLength(2);
  });
});
