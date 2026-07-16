import type { NextResponse } from 'next/server';

/**
 * Copies every `Set-Cookie` header from a `Response` returned by an in-process
 * `auth.api.*` call (invoked with `asResponse: true`) onto a `NextResponse`
 * this route handler is about to return to the browser.
 */
export function forwardSetCookies(from: Response, to: NextResponse): void {
  for (const cookie of from.headers.getSetCookie()) {
    to.headers.append('set-cookie', cookie);
  }
}
