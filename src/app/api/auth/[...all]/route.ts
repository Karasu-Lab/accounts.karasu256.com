import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth/server';
import { handlePreflight, withCors } from '@/lib/auth/cors';

const handlers = toNextJsHandler(auth);

export const GET = withCors(handlers.GET);
export const POST = withCors(handlers.POST);
export const OPTIONS = handlePreflight;
