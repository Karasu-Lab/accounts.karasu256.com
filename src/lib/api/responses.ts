import { NextResponse } from 'next/server';

/** Returns a 400 Bad Request JSON response. */
export function badRequest(): NextResponse {
  return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
}

/** Returns a 401 Unauthorized JSON response. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Returns a 404 Not Found JSON response. */
export function notFound(): NextResponse {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
