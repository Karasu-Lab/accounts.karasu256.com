'use client';

import * as React from 'react';
import { ExternalLink, LogOut, Plus } from 'lucide-react';
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
  UserAvatar,
} from '@karasu-lab/ui';

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
  onAddAccount?: () => void;
}

export function HeaderAccountMenu({ user, appUrl, onSignOut, onAddAccount }: HeaderAccountMenuProps) {
  const t = useTranslations();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
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
        <UserAvatar uid={user.uid} iconUrl={user.photoURL} size={32} />
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
            <DropdownMenuItem disabled={signingOut} onClick={() => void handleSignOut()}>
              <LogOut className="size-4" />
              {t('settings.signOut')}
            </DropdownMenuItem>
            {onAddAccount && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={signingOut} onClick={onAddAccount}>
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
