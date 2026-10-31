'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EditableSettingsItemProps {
  /** Title label of the item. */
  label: string;
  /** The item's current value, shown under the label. */
  value: React.ReactNode;
  /**
   * Invoked when the item is edited: by pressing the edit icon button at
   * the right end, or — when {@link pressable} is set — by pressing
   * anywhere on the item. Omit to render the item without an edit
   * affordance.
   */
  onEdit?: () => void;
  /** Accessible label of the edit control. Defaults to {@link label}. */
  editLabel?: string;
  /**
   * When true, the whole item is the press target and the edit icon is
   * shown as a visual marker only. Use this when the value is plain
   * content; leave it unset when the value itself is interactive (for
   * example an avatar with its own menu), so only the edit icon button
   * at the right end stays pressable.
   */
  pressable?: boolean;
  /**
   * Disables the item instead of replacing it with a loading skeleton:
   * while loading, the item stays visible with its edit control
   * disabled, and is enabled once loading finishes.
   */
  disabled?: boolean;
  className?: string;
}

/**
 * A generic editable settings item. It spans the full width of the
 * screen, shows a title label and its value, carries a full-width
 * underline that marks it as an item, and shows an edit icon at the
 * right end that marks it as editable.
 */
export function EditableSettingsItem({ label, value, onEdit, editLabel, pressable = false, disabled = false, className }: EditableSettingsItemProps) {
  const isPressable = pressable && onEdit !== undefined;

  return (
    <div data-slot="editable-settings-item" className={cn('relative w-full border-b border-border', className)}>
      {isPressable && (
        <button
          type="button"
          aria-label={editLabel ?? label}
          disabled={disabled}
          onClick={onEdit}
          className="absolute inset-0 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none"
        />
      )}
      <div className={cn('flex w-full items-center gap-3 py-3', isPressable && 'pointer-events-none')}>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="text-base">{value}</div>
        </div>
        {onEdit &&
          (isPressable ? (
            <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
              <Pencil className="size-4" />
            </span>
          ) : (
            <button
              type="button"
              aria-label={editLabel ?? label}
              disabled={disabled}
              onClick={onEdit}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <Pencil className="size-4" />
            </button>
          ))}
      </div>
    </div>
  );
}
