'use client';

import * as React from 'react';
import { LoaderCircle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EditableSettingsItemProps {
  label: string;
  value: React.ReactNode;
  onEdit?: () => void;
  editLabel?: string;
  trailing?: React.ReactNode;
  pressable?: boolean;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
}

export function EditableSettingsItem({
  label,
  value,
  onEdit,
  editLabel,
  trailing,
  pressable = false,
  disabled = false,
  busy = false,
  className,
}: EditableSettingsItemProps) {
  const isPressable = pressable && onEdit !== undefined && trailing === undefined;
  const isDisabled = disabled || busy;
  const editIcon = busy ? <LoaderCircle className="size-4 animate-spin" /> : <Pencil className="size-4" />;

  return (
    <div
      data-slot="editable-settings-item"
      aria-busy={busy || undefined}
      className={cn('relative w-full border-b border-border', busy && 'pointer-events-none opacity-50', className)}
    >
      {isPressable && (
        <button
          type="button"
          aria-label={editLabel ?? label}
          disabled={isDisabled}
          onClick={onEdit}
          className="absolute inset-0 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none"
        />
      )}
      <div className={cn('flex w-full items-center gap-3 py-3', isPressable && 'pointer-events-none')}>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="text-base">{value}</div>
        </div>
        {trailing !== undefined ? (
          <span className="relative z-10 shrink-0">{trailing}</span>
        ) : onEdit ? (
          isPressable ? (
            <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
              {editIcon}
            </span>
          ) : (
            <button
              type="button"
              aria-label={editLabel ?? label}
              disabled={isDisabled}
              onClick={onEdit}
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none',
                !busy && 'disabled:opacity-50'
              )}
            >
              {editIcon}
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
