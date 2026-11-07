import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './locales';

// Pages are prerendered as static assets, so the server-side locale is
// always the default; the client resolves the NEXT_LOCALE cookie instead.
export default getRequestConfig(async () => {
  return {
    locale: defaultLocale,
    messages: (await import(`../../messages/${defaultLocale}.json`)).default,
  };
});
