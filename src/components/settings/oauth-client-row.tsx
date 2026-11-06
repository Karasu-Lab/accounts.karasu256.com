'use client';

import { Copy, Globe, KeyRound, MoreHorizontal, Pencil, Play, Smartphone, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuPopup, DropdownMenuPortal, DropdownMenuPositioner, DropdownMenuSeparator, DropdownMenuTrigger, toast } from '@karasu-lab/ui';
import { oauthClientIsPublic, oauthClientType, type OAuthClientSummary } from '@/lib/api/developer';
import { SettingsItemContainer } from './settings-item-container';
import { useReportError } from './error-context';

interface OAuthClientRowProps {
  client: OAuthClientSummary;
  onSelect: (_client: OAuthClientSummary) => void;
  onTest: (_client: OAuthClientSummary) => void;
  onEdit: (_client: OAuthClientSummary) => void;
  onDelete: (_clientId: string) => void;
  onRotateSecret: (_client: OAuthClientSummary) => void;
  hasItemAbove?: boolean;
  hasItemBelow?: boolean;
}

const DEVELOPER_ICON_BACKGROUND_COLOR = '#475569';

export function OAuthClientRow({ client, onSelect, onTest, onEdit, onDelete, onRotateSecret, hasItemAbove, hasItemBelow }: OAuthClientRowProps) {
  const t = useTranslations();
  const reportError = useReportError();
  const TypeIcon = oauthClientType(client) === 'device' ? Smartphone : Globe;
  const iconImageSrc = client.icon_url ?? client.logo_uri ?? undefined;

  async function handleCopyClientId() {
    try {
      await navigator.clipboard.writeText(client.client_id);
      toast.success(t('settings.developer.clientIdCopied'));
    } catch (err) {
      reportError(err);
    }
  }

  return (
    <SettingsItemContainer
      title={client.client_name ?? client.client_id}
      description={client.description ?? undefined}
      autoFitText
      icon={TypeIcon}
      iconImageSrc={iconImageSrc}
      iconBadge={iconImageSrc ? <TypeIcon className="size-2.5 text-foreground" /> : undefined}
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
                  {oauthClientType(client) !== 'device' && !oauthClientIsPublic(client) && (
                    <DropdownMenuItem onClick={() => onRotateSecret(client)}>
                      <KeyRound className="size-4" />
                      {t('settings.developer.rotateSecret')}
                    </DropdownMenuItem>
                  )}
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
