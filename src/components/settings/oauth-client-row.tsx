'use client';

import { KeyRound, MoreHorizontal, Pencil, Play, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuPopup,
  DropdownMenuPortal,
  DropdownMenuPositioner,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  R2Image,
  SettingsItem,
} from '@Hashibutogarasu/ui';
import { groupScopesBySection, type OAuthClientSummary } from '@/lib/api/developer';

interface OAuthClientRowProps {
  client: OAuthClientSummary;
  onTest: (_client: OAuthClientSummary) => void;
  onEdit: (_client: OAuthClientSummary) => void;
  onDelete: (_clientId: string) => void;
  onRotateSecret: (_client: OAuthClientSummary) => void;
}

/**
 * Displays a single OAuth client row with icon, name, redirect URIs,
 * scope badges, a dedicated edit button, and a three-dot menu for
 * additional actions (test, delete).
 */
export function OAuthClientRow({ client, onTest, onEdit, onDelete, onRotateSecret }: OAuthClientRowProps) {
  const t = useTranslations();

  const grantedSections = groupScopesBySection(client.scope?.split(' ') ?? []);

  return (
    <SettingsItem className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {client.logo_uri && <R2Image src={client.logo_uri} alt="" width={32} height={32} className="rounded size-8 shrink-0 object-cover" />}
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium truncate">{client.client_name}</p>
          <div className="space-y-0.5">
            {client.redirect_uris.map((uri) => (
              <p key={uri} className="text-xs text-muted-foreground truncate font-mono">
                {uri}
              </p>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {grantedSections.map((s) => {
              const suffix = s.canRead && s.canWrite ? ' R/W' : s.canWrite ? ' W' : ' R';
              return (
                <Badge key={s.key} variant="secondary" className="text-xs">
                  {t(`permissions.sections.${s.key}.label`)}
                  {suffix}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
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
                <DropdownMenuItem onClick={() => onRotateSecret(client)}>
                  <KeyRound className="size-4" />
                  {t('settings.developer.rotateSecret')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive hover:text-destructive"
                  onClick={() => onDelete(client.client_id)}
                >
                  <Trash2 className="size-4" />
                  {t('settings.developer.delete')}
                </DropdownMenuItem>
              </DropdownMenuPopup>
            </DropdownMenuPositioner>
          </DropdownMenuPortal>
        </DropdownMenu>
      </div>
    </SettingsItem>
  );
}
