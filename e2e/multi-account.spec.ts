import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

interface TestCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  expires?: number;
}

interface CreateTestAccountResult {
  uid: string;
  email: string;
  password: string;
  sessionToken: string;
  cookies: TestCookie[];
}

const AUTH_URL = 'http://localhost:3004';
const AUTH_API_URL = 'http://localhost:8790';

async function createTestAccount(request: APIRequestContext, label: string): Promise<CreateTestAccountResult> {
  const res = await request.post(`${AUTH_API_URL}/api/test/accounts`, { data: { label } });
  expect(res.ok(), `failed to create test account "${label}"`).toBeTruthy();
  return res.json();
}

async function deleteTestAccount(request: APIRequestContext, uid: string): Promise<void> {
  await request.delete(`${AUTH_API_URL}/api/test/accounts`, { data: { uid } });
}

async function fillSignInForm(page: Page, account: CreateTestAccountResult) {
  await page.getByRole('textbox', { name: 'メールアドレス' }).fill(account.email);
  await page.getByRole('textbox', { name: 'パスワード' }).fill(account.password);
  await page.getByRole('button', { name: 'サインイン', exact: true }).click();
}

async function signInViaUi(page: Page, account: CreateTestAccountResult) {
  await page.goto('/settings/profile');
  await page.waitForURL(`${AUTH_URL}/sign-in?**`);
  await fillSignInForm(page, account);
  await page.waitForURL('/settings/profile');
}

/**
 * Signs in a second account without disturbing the current one — `multiSession`
 * tracks every sign-in as an additional device session (instead of replacing
 * the current one) and makes it the active session.
 */
async function addAccountViaApi(page: Page, account: CreateTestAccountResult): Promise<{ sessionToken: string }> {
  const res = await page.request.post(`${AUTH_API_URL}/api/auth/sign-in/email`, {
    headers: { Origin: AUTH_URL },
    data: { email: account.email, password: account.password },
  });
  expect(res.ok(), `failed to add account ${account.email}`).toBeTruthy();
  const { token } = (await res.json()) as { token: string };
  return { sessionToken: token };
}

/** The settings menu at /settings, which hosts the account switcher items. */
async function gotoSettingsMenu(page: Page) {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'アカウント設定' })).toBeVisible();
}

test.describe('multi-account switching', () => {
  test.describe.configure({ mode: 'serial' });

  let accountA: CreateTestAccountResult;
  let accountB: CreateTestAccountResult;

  test.beforeAll(async ({ request }) => {
    accountA = await createTestAccount(request, 'a');
    accountB = await createTestAccount(request, 'b');
  });

  test.afterAll(async ({ request }) => {
    await deleteTestAccount(request, accountA.uid);
    await deleteTestAccount(request, accountB.uid);
    const res = await request.get('/api/accounts');
    if (res.ok()) {
      const { accounts } = (await res.json()) as { accounts: { uid: string }[] };
      expect(accounts.some((a) => a.uid === accountA.uid || a.uid === accountB.uid)).toBe(false);
    }
  });

  test('creates a test account and signs in', async ({ page }) => {
    await signInViaUi(page, accountA);
    await gotoSettingsMenu(page);
    await expect(page.getByRole('button', { name: 'アカウントメニュー' })).toBeVisible();
  });

  test('adds a second account and switches between them', async ({ page }) => {
    await signInViaUi(page, accountA);
    await gotoSettingsMenu(page);

    await page.getByRole('button', { name: 'アカウントメニュー' }).click();
    await page.getByRole('menuitem', { name: '別のアカウントを追加' }).click();

    await page.getByRole('dialog').getByRole('button', { name: 'サインインへ進む' }).click();
    await page.waitForURL(`${AUTH_URL}/sign-in?**`);
    expect(new URL(page.url()).searchParams.get('prompt')).toBe('login');
    await fillSignInForm(page, accountB);
    /* Adding returns to the menu with the previous account active again
       (the "switch after add" checkbox was left unchecked), so the new
       account appears in the header account menu as a switchable item. */
    await page.waitForURL((url) => url.pathname === '/settings');

    await page.getByRole('button', { name: 'アカウントメニュー' }).click();
    await expect(page.getByRole('menuitem', { name: accountB.email })).toBeVisible({ timeout: 10000 });
    await page.getByRole('menuitem', { name: accountB.email }).click();

    /* After switching, the previously active account is the switchable one. */
    await page.getByRole('button', { name: 'アカウントメニュー' }).click();
    await expect(page.getByRole('menuitem', { name: accountA.email })).toBeVisible({ timeout: 10000 });

    const accountsRes = await page.request.get('/api/accounts');
    expect(accountsRes.ok()).toBeTruthy();
    const { activeUid } = (await accountsRes.json()) as { activeUid: string | null };
    expect(activeUid).toBe(accountB.uid);
  });

  test('removes a bridged account', async ({ page, context }) => {
    await context.addCookies(accountA.cookies);
    await page.goto('/settings');

    const added = await addAccountViaApi(page, accountB);

    const removeRes = await page.request.post('/api/accounts/remove', {
      data: { sessionToken: added.sessionToken },
    });
    expect(removeRes.ok()).toBeTruthy();

    const listRes = await page.request.get('/api/accounts');
    const { accounts } = (await listRes.json()) as { accounts: { uid: string }[] };
    expect(accounts.some((a) => a.uid === accountB.uid)).toBe(false);
  });
});
