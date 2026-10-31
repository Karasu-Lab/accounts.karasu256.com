'use client';

import { useState } from 'react';
import { AppWindow, Bug, Code2, ExternalLink, Link as LinkIcon, LogOut, Pencil, Shield, User, UserPlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SettingsItemContainer, SettingsItemGroup } from './settings-item-container';
import { useSettingsMenu } from './settings-menu-context';
import { useSettingsUser } from './user-context';

/**
 * The settings menu shown at `/settings`, built entirely from
 * {@link SettingsItemContainer}s. It carries everything the abolished
 * sidebar (drawer) used to host: the section navigation (now grouped by
 * category, with a description and an icon per item), the other accounts
 * on this device with switching and removal, adding an account, going
 * back to the root app, and signing out.
 *
 * Groups are separated by a wide margin (`space-y-8` on the wrapper) so
 * each concern or category reads as its own block, while items inside a
 * group stay connected with no gap.
 *
 * At the very top sits a standalone account item (its own single-item
 * group): its title is the account's name and its description is the
 * email address, both taken from the session; its icon is the account's
 * image when one is set; and its arrow is replaced with the edit pencil,
 * since it leads to the profile editor.
 */
export function SettingsMenu() {
  const t = useTranslations();
  const { user, ready } = useSettingsUser();
  const { appUrl, accounts, onSignOut, onSwitchAccount, onAddAccount, onRemoveAccount } = useSettingsMenu();
  const [removingUid, setRemovingUid] = useState<string | null>(null);

  async function handleRemoveAccount(uid: string) {
    if (removingUid !== null) return;
    setRemovingUid(uid);
    try {
      await onRemoveAccount(uid);
    } finally {
      setRemovingUid(null);
    }
  }

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
          />
        </SettingsItemGroup>
      )}

      <SettingsItemGroup>
        <SettingsItemContainer
          href="/settings/profile"
          icon={User}
          iconBackgroundColor="#2563eb"
          title={t('settings.sections.profile')}
          description={t('settings.menu.descriptions.profile')}
        />
        <SettingsItemContainer
          href="/settings/security"
          icon={Shield}
          iconBackgroundColor="#16a34a"
          title={t('settings.sections.security')}
          description={t('settings.menu.descriptions.security')}
        />
        <SettingsItemContainer
          href="/settings/linking"
          icon={LinkIcon}
          iconBackgroundColor="#9333ea"
          title={t('settings.sections.connections')}
          description={t('settings.menu.descriptions.connections')}
        />
        <SettingsItemContainer
          href="/settings/authorized-apps"
          icon={AppWindow}
          iconBackgroundColor="#ea580c"
          title={t('settings.sections.authorizedApps')}
          description={t('settings.menu.descriptions.authorizedApps')}
        />
      </SettingsItemGroup>

      <SettingsItemGroup>
        <SettingsItemContainer
          href="/settings/developer"
          icon={Code2}
          iconBackgroundColor="#475569"
          title={t('settings.sections.developer')}
          description={t('settings.menu.descriptions.developer')}
        />
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
          {accounts.map((account) => (
            <SettingsItemContainer
              key={account.uid}
              icon={User}
              title={account.displayName ?? account.email ?? account.uid}
              description={
                account.displayName && account.email ? account.email : t('settings.accountSwitcher.switchAccount')
              }
              onClick={() => void onSwitchAccount(account.uid)}
              trailing={
                <button
                  type="button"
                  aria-label={t('settings.accountSwitcher.removeAccount')}
                  disabled={removingUid !== null}
                  onClick={() => void handleRemoveAccount(account.uid)}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  <X className="size-4" />
                </button>
              }
            />
          ))}
          <SettingsItemContainer
            icon={UserPlus}
            iconBackgroundColor="#2563eb"
            title={t('settings.accountSwitcher.addAccount')}
            description={t('settings.menu.descriptions.addAccount')}
            onClick={onAddAccount}
          />
          <SettingsItemContainer
            icon={ExternalLink}
            title={t('settings.backToApp')}
            description={t('settings.menu.descriptions.backToApp')}
            href={appUrl}
          />
          <SettingsItemContainer
            icon={LogOut}
            iconBackgroundColor="#dc2626"
            title={t('settings.signOut')}
            description={t('settings.menu.descriptions.signOut')}
            onClick={() => void onSignOut()}
          />
        </SettingsItemGroup>
      )}
    </div>
  );
}
