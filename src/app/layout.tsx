import type { Metadata } from 'next';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import './globals.css';
import { geistSans, geistMono, notoSansJP } from '@karasu-lab/ui/fonts';
import { defaultLocale } from '@/i18n/locales';
import { LocaleProvider } from '@/components/locale-provider';
import { RootProviders } from '@/components/root-providers';
import jaMessages from '../../messages/ja.json';

config.autoAddCss = false;

const siteTitle = jaMessages.Metadata.siteTitle;
const siteDescription = jaMessages.Metadata.siteDescription;

export const metadata: Metadata = {
  metadataBase: new URL('https://accounts.karasu256.com'),
  title: { default: siteTitle, template: '%s' },
  description: siteDescription,
  icons: {
    icon: '/icons/kara_su.png',
    shortcut: '/icons/kara_su.png',
    apple: '/icons/kara_su.png',
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName: 'Karasu Lab',
    locale: defaultLocale,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: siteTitle,
    description: siteDescription,
  },
};

/** Root layout — applies Geist fonts and full-height flex column. */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={defaultLocale} className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <LocaleProvider>
          <RootProviders>{children}</RootProviders>
        </LocaleProvider>
      </body>
    </html>
  );
}
