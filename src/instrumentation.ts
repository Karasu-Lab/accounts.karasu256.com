/**
 * Next.js startup hook. On Node.js servers, clears JWKS a branch preview database
 * inherited from production before requests are served.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { resetInheritedJwks } = await import('@/lib/auth/preview-jwks');
  await resetInheritedJwks();
}
