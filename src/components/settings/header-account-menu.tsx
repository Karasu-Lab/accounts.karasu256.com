'use client';

import * as React from 'react';
import { ExternalLink, LogOut, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuPopup,
  DropdownMenuPortal,
  DropdownMenuPositioner,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
  Spinner,
  UserAvatar,
} from '@karasu-lab/ui';
import type { AccountSummary } from '@/lib/api/accounts';
import { avatarSrc } from '@/lib/avatar/avatar-src';

export interface HeaderAccountMenuUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface HeaderAccountMenuProps {
  user: HeaderAccountMenuUser | null;
  appUrl: string | undefined;
  onSignOut: () => void | Promise<void>;
  accounts?: AccountSummary[];
  onSwitchAccount?: (uid: string) => void | Promise<void>;
  onAddAccount?: () => void;
  onRemoveAccount?: (uid: string) => void | Promise<void>;
}

export function HeaderAccountMenu({ user, appUrl, onSignOut, accounts: accountsProp, onSwitchAccount, onAddAccount, onRemoveAccount }: HeaderAccountMenuProps) {
  const t = useTranslations();
  const [switchingUid, setSwitchingUid] = React.useState<string | null>(null);
  const [removingUid, setRemovingUid] = React.useState<string | null>(null);
  const [signingOut, setSigningOut] = React.useState(false);
  const isBusy = switchingUid !== null || removingUid !== null || signingOut;

  const accounts = accountsProp ?? [];

  async function handleSignOut() {
    if (isBusy) return;
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  }

  async function handleSwitchAccount(uid: string) {
    if (isBusy) return;
    setSwitchingUid(uid);
    try {
      await onSwitchAccount?.(uid);
    } finally {
      setSwitchingUid(null);
    }
  }

  async function handleRemoveAccount(uid: string) {
    if (isBusy) return;
    setRemovingUid(uid);
    try {
      await onRemoveAccount?.(uid);
    } finally {
      setRemovingUid(null);
    }
  }

  if (!user) {
    return <Skeleton className="size-8 shrink-0 rounded-full" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('settings.accountMenu')}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <UserAvatar uid={user.uid} iconUrl={avatarSrc(user.photoURL)} size={32} />
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuPositioner side="bottom" align="end" sideOffset={4}>
          <DropdownMenuPopup>
            <div className="px-3 py-2">
              {user.displayName && <p className="truncate text-sm font-medium">{user.displayName}</p>}
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!appUrl} {...(appUrl ? { render: <a href={appUrl} /> } : {})}>
              <ExternalLink className="size-4" />
              {t('settings.backToApp')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isBusy} onClick={() => void handleSignOut()}>
              <LogOut className="size-4" />
              {t('settings.signOut')}
            </DropdownMenuItem>
            {accounts.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {accounts.map((account) => {
                  const isRemoving = removingUid === account.uid;
                  return (
                    <DropdownMenuItem key={account.uid} className="gap-2" disabled={isBusy} onClick={() => void handleSwitchAccount(account.uid)}>
                      <UserAvatar uid={account.uid} iconUrl={avatarSrc(account.photoURL)} size={20} />
                      <div className="grid min-w-0 flex-1 leading-tight">
                        {account.displayName && <span className="truncate text-sm">{account.displayName}</span>}
                        <span className="truncate text-xs text-muted-foreground">{account.email}</span>
                      </div>
                      {onRemoveAccount && (
                        <button
                          type="button"
                          aria-label={t('settings.accountSwitcher.removeAccount')}
                          disabled={isBusy}
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRemoveAccount(account.uid);
                          }}
                        >
                          {isRemoving ? <Spinner className="size-3.5" /> : <X className="size-3.5" />}
                        </button>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}
            {onAddAccount && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={isBusy} onClick={onAddAccount}>
                  <Plus className="size-4" />
                  {t('settings.accountSwitcher.addAccount')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuPopup>
        </DropdownMenuPositioner>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
