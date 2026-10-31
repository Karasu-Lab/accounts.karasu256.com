'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, Settings, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Icon background color used when a settings item does not specify one. */
const DEFAULT_ICON_BACKGROUND_COLOR = '#8e8e93';

export interface SettingsItemContainerProps {
  /** Item heading. Always shown. */
  title: string;
  /** Supporting text shown under {@link title}. Always shown in full: it wraps onto multiple lines instead of being truncated with an ellipsis. */
  description: string;
  /** Icon shown in the colored tile on the left. Defaults to the gear (`Settings`) icon. */
  icon?: LucideIcon;
  /**
   * Image shown in the tile instead of {@link icon}, for example an
   * account's avatar. The image fills the tile (cropped with
   * `object-cover`); the icon background color still applies behind it.
   */
  iconImageSrc?: string;
  /** CSS background color of the icon tile. Defaults to gray. */
  iconBackgroundColor?: string;
  /**
   * Icon shown on the right of an interactive item, in place of the
   * default navigation arrow (`ChevronRight`) — for example the edit
   * pencil (`Pencil`). Ignored when `trailing` is provided.
   */
  arrowIcon?: LucideIcon;
  /** When set, the whole item navigates to this destination. External (absolute) URLs render a plain anchor. */
  href?: string;
  /** When set (and no `href`), the whole item acts as a button invoking this handler. */
  onClick?: () => void;
  /**
   * Optional trailing content (for example a remove button) rendered instead
   * of the navigation chevron. It stays interactive even though the rest of
   * the item's content lets clicks pass through to the item itself.
   */
  trailing?: React.ReactNode;
  /** True when another item sits directly above this one in a {@link SettingsItemGroup}. */
  hasItemAbove?: boolean;
  /** True when another item sits directly below this one in a {@link SettingsItemGroup}. */
  hasItemBelow?: boolean;
  className?: string;
}

/**
 * One row of a settings menu: a colored icon tile, a title, and a
 * description, optionally acting as a link or a button.
 *
 * Corner rounding depends on the item's position among connected items:
 * an item with another item above it loses its top-left and top-right
 * rounding, and an item with another item below it loses its bottom-left
 * and bottom-right rounding, so a group reads as one continuous rounded
 * container. {@link SettingsItemGroup} sets `hasItemAbove` /
 * `hasItemBelow` automatically; pass them explicitly only for items
 * composed outside a group.
 */
export function SettingsItemContainer({
  title,
  description,
  icon: Icon = Settings,
  iconImageSrc,
  iconBackgroundColor = DEFAULT_ICON_BACKGROUND_COLOR,
  arrowIcon: ArrowIcon = ChevronRight,
  href,
  onClick,
  trailing,
  hasItemAbove = false,
  hasItemBelow = false,
  className,
}: SettingsItemContainerProps) {
  const isInteractive = href !== undefined || onClick !== undefined;
  const overlayClassName = cn(
    'absolute inset-0 rounded-[inherit] transition-colors',
    'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
  );

  return (
    <div
      data-slot="settings-item-container"
      className={cn(
        'relative flex items-center gap-3 border border-border bg-card px-4 py-3 text-card-foreground',
        'rounded-xl',
        /* Connected items share one outline: only the group's outer edges keep a border. */
        hasItemAbove && 'rounded-t-none border-t-0',
        hasItemBelow && 'rounded-b-none border-b-0',
        className
      )}
    >
      {href !== undefined ? (
        href.startsWith('http://') || href.startsWith('https://') ? (
          <a href={href} aria-label={title} className={overlayClassName} />
        ) : (
          <Link href={href} aria-label={title} className={overlayClassName} />
        )
      ) : onClick !== undefined ? (
        <button type="button" aria-label={title} onClick={onClick} className={cn(overlayClassName, 'cursor-pointer')} />
      ) : null}

      <span
        aria-hidden="true"
        className="pointer-events-none flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md"
        style={{ backgroundColor: iconBackgroundColor }}
      >
        {iconImageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconImageSrc} alt="" className="size-full object-cover" />
        ) : (
          <Icon className="size-4.5 text-white" />
        )}
      </span>
      <span className="pointer-events-none min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>

      {trailing !== undefined ? (
        <span className="relative z-10 shrink-0">{trailing}</span>
      ) : isInteractive ? (
        <ArrowIcon aria-hidden="true" className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
      ) : null}
    </div>
  );
}

export interface SettingsItemGroupProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A stack of connected {@link SettingsItemContainer}s forming one settings
 * group. Items are joined with no gap; the divider between two connected
 * items is transparent (`divide-transparent`), so no line of its own is
 * drawn and the items' background color applies across the join as-is.
 * Each child is told whether an item sits above or below it so it can drop
 * the corner rounding that faces its neighbour.
 *
 * Separate groups (different concerns or categories) are spaced apart by
 * the parent layout, not by this component.
 */
export function SettingsItemGroup({ children, className }: SettingsItemGroupProps) {
  const items = React.Children.toArray(children);
  return (
    <div className={cn('flex flex-col divide-y divide-transparent', className)}>
      {items.map((child, index) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<SettingsItemContainerProps>, {
          key: child.key ?? index,
          hasItemAbove: index > 0,
          hasItemBelow: index < items.length - 1,
        });
      })}
    </div>
  );
}
