import type { Instrumentation } from 'next';
import { z } from 'zod';

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const cause = error instanceof Error ? error : new Error(String(error));
  const where = {
    method: request.method,
    path: request.path,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
  };

  if (cause instanceof z.ZodError) {
    console.error(
      JSON.stringify({
        level: 'error',
        kind: 'validation',
        ...where,
        issues: cause.issues.map((issue) => ({ path: issue.path.join('.') || '(root)', code: issue.code, message: issue.message })),
      })
    );
    return;
  }

  console.error(
    JSON.stringify({ level: 'error', kind: 'unhandled', ...where, name: cause.name, message: cause.message, stack: cause.stack })
  );
};
