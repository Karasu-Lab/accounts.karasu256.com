import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { testAuth } from '@/lib/auth/server.test';

const postBodySchema = z.object({ label: z.string().min(1) });
const deleteBodySchema = z.object({ uid: z.string().min(1) });

/**
 * Test-only endpoint for the Playwright E2E suite (`e2e/multi-account.spec.ts`).
 * Never reachable in production — guarded by `NODE_ENV` rather than a
 * dedicated env flag, so there is no extra variable to configure or forget.
 */
function guardTestMode(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return null;
}

/**
 * Creates a real better-auth test user with a working `credential`
 * (email/password) account and signs it in as a bridged `multiSession`
 * device session (via the test-only `testAuth` instance's `ctx.test.login`,
 * per better-auth's `testUtils` plugin). Returns the plaintext password and
 * every cookie Playwright's `context.addCookies()` needs to start a test
 * already signed in, so the E2E spec can drive the app's real sign-in form
 * UI end-to-end without mocking anything.
 *
 * POST /api/test/accounts
 * Body: { label: string }
 */
export async function POST(request: NextRequest) {
  const guard = guardTestMode();
  if (guard) return guard;

  const parsed = postBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'label required' }, { status: 400 });
  }

  const email = `e2e-${parsed.data.label}-${Date.now()}@example.test`;
  const password = crypto.randomUUID();

  const ctx = await testAuth.$context;
  const user = await ctx.test.saveUser(ctx.test.createUser({ email, name: email }));

  const passwordHash = await ctx.password.hash(password);
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: passwordHash,
  });

  const { token, cookies } = await ctx.test.login({ userId: user.id });

  return NextResponse.json({ uid: user.id, email, password, sessionToken: token, cookies });
}

/**
 * Deletes a test account created via `POST`, from better-auth's
 * `users`/`session`/`account` rows (which cascade-delete via the schema's
 * `onDelete: 'cascade'` foreign keys).
 *
 * DELETE /api/test/accounts
 * Body: { uid: string }
 */
export async function DELETE(request: NextRequest) {
  const guard = guardTestMode();
  if (guard) return guard;

  const parsed = deleteBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'uid required' }, { status: 400 });
  }

  const ctx = await testAuth.$context;
  await ctx.test.deleteUser(parsed.data.uid);

  return NextResponse.json({ ok: true });
}
