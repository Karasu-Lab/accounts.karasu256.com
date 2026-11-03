'use client';

import { Code2, Copy, KeyRound, MoreHorizontal, Pencil, Play, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuPopup, DropdownMenuPortal, DropdownMenuPositioner, DropdownMenuSeparator, DropdownMenuTrigger, toast } from '@karasu-lab/ui';
import type { OAuthClientSummary } from '@/lib/api/developer';
import { SettingsItemContainer } from './settings-item-container';

interface OAuthClientRowProps {
  client: OAuthClientSummary;
  onSelect: (_client: OAuthClientSummary) => void;
  onTest: (_client: OAuthClientSummary) => void;
  onEdit: (_client: OAuthClientSummary) => void;
  onDelete: (_clientId: string) => void;
  onRotateSecret: (_client: OAuthClientSummary) => void;
  /** Forwarded from {@link SettingsItemGroup}: true when another item sits directly above this one. */
  hasItemAbove?: boolean;
  /** Forwarded from {@link SettingsItemGroup}: true when another item sits directly below this one. */
  hasItemBelow?: boolean;
}

/** Icon tile color of the developer items, matching the developer entry in the settings menu. */
const DEVELOPER_ICON_BACKGROUND_COLOR = '#475569';

/**
 * A single OAuth client as a settings item: the client's logo in the
 * icon tile (or the developer icon when it has none), its name as the
 * title, and its redirect URIs as the description. The texts auto-fit
 * like the profile item at the top of the account settings menu: they
 * stay on one line and their font size shrinks to fit, so a long
 * callback URI does not wrap and break the item's layout. A dedicated
 * edit button and a three-dot menu for additional actions (test, copy
 * client ID, rotate secret, delete) sit at the right end. Selecting
 * the item itself opens the client information dialog, which shows
 * the client's scopes in consent screen format — the item no longer
 * summarizes scopes into proprietary chips (e.g. "Profile R/W").
 */
export function OAuthClientRow({ client, onSelect, onTest, onEdit, onDelete, onRotateSecret, hasItemAbove, hasItemBelow }: OAuthClientRowProps) {
  const t = useTranslations();

  async function handleCopyClientId() {
    try {
      await navigator.clipboard.writeText(client.client_id);
      toast.success(t('settings.developer.clientIdCopied'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <SettingsItemContainer
      title={client.client_name ?? client.client_id}
      description={client.redirect_uris.join(' ')}
      autoFitText
      icon={Code2}
      iconImageSrc={client.logo_uri ?? undefined}
      iconBackgroundColor={DEVELOPER_ICON_BACKGROUND_COLOR}
      onClick={() => onSelect(client)}
      hasItemAbove={hasItemAbove}
      hasItemBelow={hasItemBelow}
      trailing={
        <span className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label={t('settings.developer.edit')} onClick={() => onEdit(client)}>
            <Pencil className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="icon" variant="ghost" aria-label={t('settings.developer.menu')}>
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuPortal>
              <DropdownMenuPositioner align="end" side="bottom" sideOffset={4}>
                <DropdownMenuPopup>
                  <DropdownMenuItem onClick={() => onTest(client)}>
                    <Play className="size-4" />
                    {t('settings.developer.testClient')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleCopyClientId()}>
                    <Copy className="size-4" />
                    {t('settings.developer.copyClientId')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRotateSecret(client)}>
                    <KeyRound className="size-4" />
                    {t('settings.developer.rotateSecret')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive hover:text-destructive" onClick={() => onDelete(client.client_id)}>
                    <Trash2 className="size-4" />
                    {t('settings.developer.delete')}
                  </DropdownMenuItem>
                </DropdownMenuPopup>
              </DropdownMenuPositioner>
            </DropdownMenuPortal>
          </DropdownMenu>
        </span>
      }
    />
  );
}
