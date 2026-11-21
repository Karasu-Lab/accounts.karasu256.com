'use client';

import { AppWindow, Bug, Code2, ExternalLink, Link as LinkIcon, LogOut, MonitorSmartphone, Pencil, Shield, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SettingsItemContainer, SettingsItemGroup } from './settings-item-container';
import { useSettingsMenu } from './settings-menu-context';
import { useSettingsUser } from './user-context';

export function SettingsMenu() {
  const t = useTranslations();
  const { user, ready } = useSettingsUser();
  const { appUrl, onSignOut } = useSettingsMenu();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      {ready && (
        <SettingsItemGroup>
          <SettingsItemContainer
            href="/settings/profile"
            icon={User}
            iconImageSrc={user.image ?? undefined}
            iconBackgroundColor="#2563eb"
            title={user.name || user.email || user.id}
            description={user.email}
            arrowIcon={Pencil}
            autoFitText
          />
        </SettingsItemGroup>
      )}

      <SettingsItemGroup>
        <SettingsItemContainer href="/settings/security" icon={Shield} iconBackgroundColor="#16a34a" title={t('settings.sections.security')} />
        <SettingsItemContainer href="/settings/linking" icon={LinkIcon} iconBackgroundColor="#9333ea" title={t('settings.sections.connections')} />
        <SettingsItemContainer
          href="/settings/authorized-apps"
          icon={AppWindow}
          iconBackgroundColor="#ea580c"
          title={t('settings.sections.authorizedApps')}
        />
        <SettingsItemContainer
          href="/settings/active-sessions"
          icon={MonitorSmartphone}
          iconBackgroundColor="#0891b2"
          title={t('settings.sections.activeSessions')}
        />
      </SettingsItemGroup>

      <SettingsItemGroup>
        <SettingsItemContainer href="/settings/developer" icon={Code2} iconBackgroundColor="#475569" title={t('settings.sections.developer')} />
        <SettingsItemContainer
          href="/settings/debug"
          icon={Bug}
          iconBackgroundColor="#dc2626"
          title={t('settings.sections.debug')}
          description={t('settings.menu.descriptions.debug')}
        />
      </SettingsItemGroup>

      {ready && (
        <SettingsItemGroup>
          <SettingsItemContainer icon={ExternalLink} title={t('settings.backToApp')} href={appUrl} />
          <SettingsItemContainer icon={LogOut} iconBackgroundColor="#dc2626" title={t('settings.signOut')} onClick={() => onSignOut()} />
        </SettingsItemGroup>
      )}
    </div>
  );
}
