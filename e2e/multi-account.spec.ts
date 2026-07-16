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

async function createTestAccount(request: APIRequestContext, label: string): Promise<CreateTestAccountResult> {
  const res = await request.post('/api/test/accounts', { data: { label } });
  expect(res.ok(), `failed to create test account "${label}"`).toBeTruthy();
  return res.json();
}

async function deleteTestAccount(request: APIRequestContext, uid: string): Promise<void> {
  await request.delete('/api/test/accounts', { data: { uid } });
}

async function signInViaUi(page: Page, account: CreateTestAccountResult) {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'メールアドレス' }).fill(account.email);
  await page.getByRole('textbox', { name: 'パスワード' }).fill(account.password);
  await page.getByRole('button', { name: 'サインイン', exact: true }).click();
  await page.waitForURL('/settings');
}

/**
 * Signs in a second account without disturbing the current one, the same way
 * `AddAccountDialog` does under the hood — `multiSession` tracks every
 * sign-in as an additional device session (instead of replacing the current
 * one) and makes it the active session.
 */
async function addAccountViaApi(page: Page, account: CreateTestAccountResult): Promise<{ sessionToken: string }> {
  const res = await page.request.post('/api/auth/sign-in/email', {
    data: { email: account.email, password: account.password },
  });
  expect(res.ok(), `failed to add account ${account.email}`).toBeTruthy();
  const { token } = (await res.json()) as { token: string };
  return { sessionToken: token };
}

/** The sidebar's account-switcher popup — scoped to avoid matching the same email shown in page content. */
function sidebarFooter(page: Page) {
  return page.locator('[data-slot="sidebar-footer"]');
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
    const res = await request.get('/api/auth/accounts');
    if (res.ok()) {
      const { accounts } = (await res.json()) as { accounts: { uid: string }[] };
      expect(accounts.some((a) => a.uid === accountA.uid || a.uid === accountB.uid)).toBe(false);
    }
  });

  test('creates a test account and signs in', async ({ page }) => {
    await signInViaUi(page, accountA);
    await expect(sidebarFooter(page).getByText(accountA.email).first()).toBeVisible();
  });

  test('adds a second account and switches between them', async ({ page }) => {
    await signInViaUi(page, accountA);
    await expect(sidebarFooter(page).getByText(accountA.email).first()).toBeVisible();

    await sidebarFooter(page).getByText(accountA.email).first().click();
    await page.getByText('別のアカウントを追加').click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'メールアドレス' }).fill(accountB.email);
    await dialog.getByRole('textbox', { name: 'パスワード' }).fill(accountB.password);
    await dialog.getByRole('button', { name: 'サインイン', exact: true }).click();
    await expect(dialog).not.toBeAttached({ timeout: 15000 });

    await sidebarFooter(page).getByText(accountA.email).first().click();
    await expect(page.getByText(accountB.email).first()).toBeVisible();
    await page.getByText(accountB.email).first().click();

    await expect(sidebarFooter(page).getByText(accountB.email).first()).toBeVisible({ timeout: 10000 });

    const accountsRes = await page.request.get('/api/auth/accounts');
    expect(accountsRes.ok()).toBeTruthy();
    const { activeUid } = (await accountsRes.json()) as { activeUid: string | null };
    expect(activeUid).toBe(accountB.uid);
  });

  test('removes a bridged account', async ({ page, context }) => {
    await context.addCookies(accountA.cookies);
    await page.goto('/settings');

    const added = await addAccountViaApi(page, accountB);

    const removeRes = await page.request.post('/api/auth/accounts/remove', {
      data: { sessionToken: added.sessionToken },
    });
    expect(removeRes.ok()).toBeTruthy();

    const listRes = await page.request.get('/api/auth/accounts');
    const { accounts } = (await listRes.json()) as { accounts: { uid: string }[] };
    expect(accounts.some((a) => a.uid === accountB.uid)).toBe(false);
  });
});
