/**
 * @vitest-environment jsdom
 *
 * What the add-account dialog remembers before sending the user to
 * sign in. Completing the addition on return needs to know which
 * account was active before leaving — both its session token (to
 * switch back to it) and its better-auth user ID (to recognise that
 * the signed-in account is that same account, whose previous session
 * `multiSession` has then replaced; see
 * ../../app/settings/settings-add-account.test.tsx).
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ja from '../../../messages/ja.json';

function resolveMessage(key: string): string {
  let node: unknown = ja;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : key;
}

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => resolveMessage(key),
}));

vi.mock('@/lib/auth/client', () => ({
  useAuthClient: () => ({
    authClient: {
      getSession: async () => ({ data: { session: { token: 'previous-token' }, user: { id: 'user-1' } } }),
    },
    config: { authApiUrl: 'https://api-auth.karasu256.com', authUrl: 'https://auth.karasu256.com' },
  }),
}));

vi.mock('@karasu-lab/utils/uri', () => ({
  buildUri: (base: string, params: Record<string, string>) => {
    const url = new URL(base);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url.toString();
  },
}));

vi.mock('@karasu-lab/ui', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Checkbox: () => null,
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogBackdrop: () => null,
  DialogPopup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

import { AddAccountDialog } from './add-account-dialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('add account dialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    sessionStorage.clear();
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
  });

  it('remembers the active account user ID and session token before leaving for sign-in', async () => {
    await act(async () => {
      root.render(<AddAccountDialog open onOpenChange={() => {}} />);
    });

    const continueButton = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'サインインへ進む');
    await act(async () => {
      continueButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const raw = sessionStorage.getItem('pendingAddAccount');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual({
      previousSessionToken: 'previous-token',
      previousUserId: 'user-1',
      switchToNewAccount: false,
    });
  });
});
