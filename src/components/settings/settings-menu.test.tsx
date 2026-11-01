/**
 * @vitest-environment jsdom
 *
 * The settings menu's descriptions. The contract pinned down here:
 *
 * 1. An item carries a description only when its name alone does not
 *    convey what it is: of the menu's section and action items, only
 *    the debug item keeps one (what it holds — diagnostic information —
 *    is not clear from its name alone). Items like sign-out and
 *    security render with no description at all; a text that merely
 *    restates the item ("サインアウトします" under サインアウト) never
 *    appears.
 * 2. Descriptions that carry information stay: the profile item shows
 *    the account's email address, and another account's row shows its
 *    email address when the row is titled with a display name.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ja from '../../../messages/ja.json';
import { SettingsMenu } from './settings-menu';
import { SettingsMenuContext } from './settings-menu-context';
import { UserContext } from './user-context';

// jsdom has no ResizeObserver; the item container's auto-fitting text
// observes its parent with one. A no-op stub suffices: these tests
// assert text content, not fitted font sizes.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

function resolveMessage(key: string): string {  let node: unknown = ja;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : key;
}

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => resolveMessage(key),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const menuValue = {
  appUrl: 'https://karasu256.com',
  accounts: [
    { uid: 'other-1', email: 'other@example.com', displayName: 'Other User' },
    { uid: 'other-2', email: 'nameless@example.com' },
  ],
  onSignOut: () => {},
  onSwitchAccount: () => {},
  onAddAccount: () => {},
  onRemoveAccount: () => {},
};

const userValue = {
  user: { id: 'user-1', email: 'me@example.com', emailVerified: true, name: 'Me', image: null },
  ready: true,
  updateUser: () => {},
};

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <UserContext.Provider value={userValue}>
        <SettingsMenuContext.Provider value={menuValue as never}>
          <SettingsMenu />
        </SettingsMenuContext.Provider>
      </UserContext.Provider>,
    );
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

function itemByTitle(title: string): Element {
  const item = [...container.querySelectorAll('[data-slot="settings-item-container"]')].find((el) =>
    el.textContent?.includes(title),
  );
  if (!item) throw new Error(`no settings item titled ${title}`);
  return item;
}

describe('settings menu descriptions', () => {
  it('shows no restating description on the section and action items', () => {
    for (const text of ['アカウントを保護します', '外部アカウントを連携します', '認可したアプリを管理します', '開発者向けツールを管理します', '別のアカウントを追加します', 'karasu256.com へ移動します', 'サインアウトします']) {
      expect(container.textContent).not.toContain(text);
    }
    // The items themselves are all still there, title only.
    for (const title of ['セキュリティ', 'アカウント連携', '認可したアプリ', 'デベロッパー', '別のアカウントを追加', 'karasu256.comへ戻る', 'サインアウト']) {
      expect(itemByTitle(title)).toBeTruthy();
    }
  });

  it('keeps the description on the debug item, whose contents its name does not convey', () => {
    expect(itemByTitle('デバッグ').textContent).toContain('診断情報を表示します');
  });

  it('keeps the email addresses as the account items descriptions', () => {
    expect(itemByTitle('Me').textContent).toContain('me@example.com');
    expect(itemByTitle('Other User').textContent).toContain('other@example.com');
    // An account row titled with its email shows no second line.
    const nameless = itemByTitle('nameless@example.com');
    expect(nameless.textContent?.match(/nameless@example\.com/g)).toHaveLength(1);
    expect(container.textContent).not.toContain('このアカウントに切り替える');
  });
});
