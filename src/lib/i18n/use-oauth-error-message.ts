'use client';

import { useTranslations } from 'next-intl';

/**
 * Returns a function that translates an OAuth error code into a localized
 * message. Unknown codes fall back to the raw code string.
 */
export function useOAuthErrorMessage() {
  const t = useTranslations('oauth.errors');
  return (code: string) => (t.has(code) ? t(code) : code);
}
