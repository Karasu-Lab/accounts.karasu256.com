import { test, expect } from '@playwright/test';

test('signs in and signs out with email and password', async ({ page, request }) => {
  const email = `e2e-sign-in-${Date.now()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;

  const signUpRes = await request.post('/api/auth/sign-up/email', {
    headers: { Origin: 'http://localhost:3001' },
    data: { email, password, name: email },
  });
  expect(signUpRes.ok()).toBeTruthy();

  await page.goto('/');
  await page.getByRole('textbox', { name: 'メールアドレス' }).fill(email);
  await page.getByLabel('パスワード', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'サインイン', exact: true }).click();
  await page.waitForURL('/settings');

  const sidebarFooter = page.locator('[data-slot="sidebar-footer"]');
  await expect(sidebarFooter.getByText(email).first()).toBeVisible();

  await sidebarFooter.getByText(email).first().click();
  await page.getByRole('menuitem', { name: 'サインアウト' }).click();
  await page.waitForURL('/');

  const sessionRes = await page.request.get('/api/auth/get-session');
  expect(sessionRes.ok()).toBeTruthy();
  expect(await sessionRes.json()).toBeNull();
});
