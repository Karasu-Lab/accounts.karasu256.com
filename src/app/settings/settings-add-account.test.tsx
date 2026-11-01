// @vitest-environment jsdom
/**
 * Regression tests for adding an account that turns out to be the
 * account that was already active.
 *
 * The reported bug: signing in with the already active account while
 * adding an account failed with a 500 and the account addition could
 * not complete. The chain behind it: better-auth's `multiSession`
 * replaces the previous session when the same user signs in again —
 * its sign-in hook deletes the earlier session for that user — so the
 * previous session token remembered before leaving for sign-in no
 * longer names a device session. Completing the addition
 * nevertheless tried to switch back to that token, and the switch
 * failed. There was no path that recognised the same user, left the
 * active account as it was, and told the user what happened.
 *
 * The contract pinned down here:
 *
 * 1. The add-account dialog remembers the active account's user ID
 *    alongside its session token, so the return can tell whose
 *    account was active before the addition.
 * 2. When the signed-in account's user ID is the remembered one, no
 *    switch is attempted and no error is shown: the active account
 *    is resolved again and left as it is, the account is not added,
 *    and the same-account dialog is shown.
 * 3. When a different account was signed in and "switch after add"
 *    was left unchecked, completion still switches back to the
 *    previously active account and shows no dialog.
 *
 * The account API is stubbed at `@/lib/api/accounts` with the device
 * session state the auth API holds after the return sign-in: in the
 * same-account cases the remembered previous token is already gone
 * from the device sessions (replaced by the new session for the same
 * user), so a switch to it would fail exactly as the real
 * `/api/accounts/switch` route fails for an unknown session token.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ja from '../../../messages/ja.json';

const userA = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };
const userB = { id: 'user-2', name: 'Other User', email: 'other@example.com', image: null };

const flow = vi.hoisted(() => ({
  /** The account that is active after returning from sign-in. */
  user: { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null as string | null },
  /** The client session for that account; a stable object, as the real session hook returns. */
  sessionData: null as { user: { id: string; name: string; email: string; image: string | null }; session: { token: string } } | null,
  /** Device sessions the auth API holds after the return sign-in. */
  deviceSessions: [] as { sessionToken: string; uid: string }[],
  switchCalls: [] as string[],
  toastErrors: [] as string[],
  refetchCalls: 0,
  refetch: async () => {},
}));

function resolveMessage(key: string): string {
  let node: unknown = ja;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : key;
}

vi.mock('next-intl', () => ({
  useTranslations: () => Object.assign((key: string) => resolveMessage(key), { has: () => false }),
}));

vi.mock('next/navigation', () => {
  /* A stable router object, as the real hook returns: a fresh object
     per render would retrigger the session provider's effects. */
  const router = { replace: () => {}, push: () => {}, refresh: () => {} };
  return {
    usePathname: () => '/settings',
    useRouter: () => router,
  };
});

vi.mock('@/lib/auth/client', () => ({
  AuthClientProvider: ({ children }: { children: unknown }) => children,
  useAuthClient: () => ({
    authClient: {
      useSession: () => ({
        data: flow.sessionData,
        isPending: false,
        refetch: flow.refetch,
      }),
      getSession: async () => ({ data: flow.sessionData }),
      signOut: async () => {},
    },
    bridgeFirebaseSession: async () => {},
    config: { authApiUrl: 'https://api-auth.karasu256.com', authUrl: 'https://auth.karasu256.com' },
  }),
}));

vi.mock('@/lib/api/accounts', () => ({
  listAccounts: async () => ({
    activeUid: flow.user.id,
    accounts: flow.deviceSessions.map((entry) => ({
      uid: entry.uid,
      sessionToken: entry.sessionToken,
      displayName: null,
      email: null,
      photoURL: null,
      addedAt: '2026-01-01T00:00:00.000Z',
    })),
  }),
  switchAccount: async (sessionToken: string) => {
    flow.switchCalls.push(sessionToken);
    const target = flow.deviceSessions.find((entry) => entry.sessionToken === sessionToken);
    if (!target) throw new Error('Unknown session');
    return { ok: true, uid: target.uid };
  },
  removeAccount: async () => ({ ok: true }),
}));

vi.mock('@/components/settings/add-account-dialog', () => ({
  AddAccountDialog: () => null,
}));

vi.mock('@/components/settings/header-account-menu', () => ({
  HeaderAccountMenu: () => null,
}));

vi.mock('@karasu-lab/ui', () => ({
  toast: {
    error: (message: unknown) => {
      flow.toastErrors.push(String(message));
    },
    success: () => {},
  },
  Spinner: () => null,
  LoadingView: () => null,
  SwitchingAccountOverlay: () => null,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div data-testid="same-account-dialog">{children}</div> : null),
  DialogPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogBackdrop: () => null,
  DialogPopup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ render }: { render: React.ReactElement }) => render,
}));

import { SettingsShell } from './shell';
import { savePendingAddAccount } from '@/lib/add-account';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  flow.user = { ...userA };
  flow.sessionData = { user: { ...userA }, session: { token: 'new-session-token' } };
  flow.refetch = async () => {
    flow.refetchCalls += 1;
  };
  flow.deviceSessions = [];
  flow.switchCalls = [];
  flow.toastErrors = [];
  flow.refetchCalls = 0;
  sessionStorage.clear();
  window.history.replaceState({}, '', '/settings');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/settings');
});

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Returns from the sign-in page the way the add-account flow does, with the given pending state remembered. */
async function renderReturnFromSignIn(pending: { previousSessionToken: string; previousUserId: string; switchToNewAccount: boolean }) {
  savePendingAddAccount(pending);
  window.history.replaceState({}, '', '/settings?accountAdded=1');
  await act(async () => {
    root.render(
      <SettingsShell appUrl="https://app.karasu256.com/" initialUser={{ id: flow.user.id, name: flow.user.name, email: flow.user.email, image: flow.user.image }}>
        <div data-testid="page-content" />
      </SettingsShell>
    );
  });
  await flush();
  await flush();
}

describe('adding the already active account', () => {
  it('shows the same-account dialog and leaves the active account as it is, without a switch or an error', async () => {
    /* The same user signed in again: multiSession replaced the
       previous session, so only the new session for that user remains
       in the device sessions and the remembered token is unknown. */
    flow.deviceSessions = [{ sessionToken: 'new-session-token', uid: userA.id }];

    await renderReturnFromSignIn({ previousSessionToken: 'previous-token', previousUserId: userA.id, switchToNewAccount: false });

    expect(flow.switchCalls).toEqual([]);
    expect(flow.toastErrors).toEqual([]);
    expect(flow.refetchCalls).toBeGreaterThan(0);

    const dialog = container.querySelector('[data-testid="same-account-dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('同じアカウントは追加できません');

    const closeButton = Array.from(dialog?.querySelectorAll('button') ?? []).find((b) => b.textContent === '閉じる');
    await act(async () => {
      closeButton?.click();
    });
    expect(container.querySelector('[data-testid="same-account-dialog"]')).toBeNull();
  });

  it('shows the same-account dialog also when switching after adding was requested', async () => {
    flow.deviceSessions = [{ sessionToken: 'new-session-token', uid: userA.id }];

    await renderReturnFromSignIn({ previousSessionToken: 'previous-token', previousUserId: userA.id, switchToNewAccount: true });

    expect(flow.switchCalls).toEqual([]);
    expect(flow.toastErrors).toEqual([]);
    expect(container.querySelector('[data-testid="same-account-dialog"]')).not.toBeNull();
  });

  it('still switches back to the previously active account when a different account was added', async () => {
    flow.user = { ...userB };
    flow.sessionData = { user: { ...userB }, session: { token: 'new-session-token' } };
    flow.deviceSessions = [
      { sessionToken: 'previous-token', uid: userA.id },
      { sessionToken: 'new-session-token', uid: userB.id },
    ];

    await renderReturnFromSignIn({ previousSessionToken: 'previous-token', previousUserId: userA.id, switchToNewAccount: false });

    expect(flow.switchCalls).toEqual(['previous-token']);
    expect(flow.toastErrors).toEqual([]);
    expect(container.querySelector('[data-testid="same-account-dialog"]')).toBeNull();
  });
});
