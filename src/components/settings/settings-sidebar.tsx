'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Shield, Link as LinkIcon, Code2, Bug } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SettingsSidebar as UiSettingsSidebar, type SidebarNavItem, type SettingsSidebarUser } from '@Hashibutogarasu/ui';

const NAV_ITEMS_DEFS = [
  { href: '/settings/profile', icon: User, labelKey: 'settings.sections.profile' },
  { href: '/settings/security', icon: Shield, labelKey: 'settings.sections.security' },
  { href: '/settings/linking', icon: LinkIcon, labelKey: 'settings.sections.connections' },
  { href: '/settings/developer', icon: Code2, labelKey: 'settings.sections.developer' },
  { href: '/settings/debug', icon: Bug, labelKey: 'settings.sections.debug' },
] as const;

interface Props {
  user: SettingsSidebarUser | null;
  appUrl: string | undefined;
  onSignOut: () => void;
  accounts?: SettingsSidebarUser[];
  onSwitchAccount?: (uid: string) => void;
  onAddAccount?: () => void;
  onRemoveAccount?: (uid: string) => void;
}

/**
 * Accounts-specific settings sidebar. Wraps {@link UiSettingsSidebar} with
 * translated labels, active-path detection, and Next.js client-side links.
 */
export function SettingsSidebar({ user, appUrl, onSignOut, accounts, onSwitchAccount, onAddAccount, onRemoveAccount }: Props) {
  const t = useTranslations();
  const pathname = usePathname();

  const navItems: SidebarNavItem[] = NAV_ITEMS_DEFS.map(({ href, icon, labelKey }) => ({
    href,
    icon,
    label: t(labelKey),
  }));

  const activeIndex = NAV_ITEMS_DEFS.findIndex(({ href }) => pathname.startsWith(href));

  return (
    <UiSettingsSidebar
      title={t('settings.title')}
      navItems={navItems}
      activeIndex={activeIndex}
      user={user}
      backToAppHref={appUrl}
      backToAppLabel={t('settings.backToApp')}
      onSignOut={onSignOut}
      signOutLabel={t('settings.signOut')}
      accounts={accounts}
      onSwitchAccount={onSwitchAccount}
      onAddAccount={onAddAccount}
      onRemoveAccount={onRemoveAccount}
      addAccountLabel={t('settings.accountSwitcher.addAccount')}
      removeAccountLabel={t('settings.accountSwitcher.removeAccount')}
      renderLink={({ href, className, title, 'aria-current': ariaCurrent, children }) => (
        <Link href={href} className={className} title={title} aria-current={ariaCurrent}>
          {children}
        </Link>
      )}
    />
  );
}
