'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Settings, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Icon background color used when a settings item does not specify one. */
const DEFAULT_ICON_BACKGROUND_COLOR = '#8e8e93';

export interface SettingsItemContainerProps {
  /** Item heading. Always shown in full: by default it wraps onto multiple lines instead of being truncated with an ellipsis. */
  title: string;
  /**
   * Supporting text shown under {@link title}. Always shown in full: it
   * wraps onto multiple lines instead of being truncated with an
   * ellipsis. Optional — most items carry none: a description is only
   * for information the title does not already convey (a value, a
   * state, or what an unclearly named item holds), never a restatement
   * of the item's own name or action.
   */
  description?: string;
  /**
   * Whether the title and description shrink their font size to fit on
   * one line instead of wrapping. Off by default: the texts wrap (long
   * unbroken strings such as email addresses wrap mid-string rather
   * than overflowing the item). When on, each text stays on a single
   * line and its font size is reduced step by step until it fits the
   * available width.
   */
  autoFitText?: boolean;
  /** Icon shown in the colored tile on the left. Defaults to the gear (`Settings`) icon. */
  icon?: LucideIcon;
  /**
   * Image shown in the tile instead of {@link icon}, for example an
   * account's avatar. The image fills the tile (cropped with
   * `object-cover`); the icon background color still applies behind it.
   */
  iconImageSrc?: string;
  /**
   * Custom icon content shown in the tile instead of {@link icon}, for
   * icon sets other than Lucide (for example a FontAwesome brand icon).
   * Ignored when {@link iconImageSrc} is set.
   */
  iconNode?: React.ReactNode;
  /**
   * Small badge content overlaid on the icon tile's bottom-right corner
   * (for example a provider's brand icon over a linked account's
   * avatar), so the tile's main content can be replaced without losing
   * what the badge identifies.
   */
  iconBadge?: React.ReactNode;
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
  onClick?: () => void | Promise<void>;
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
/** Smallest font size {@link FittingText} shrinks to, in pixels. */
const MIN_FONT_SIZE_PX = 10;

/**
 * One line of a settings item's text (its title or description). By
 * default the text wraps, breaking long unbroken strings instead of
 * overflowing. With `autoFit`, the text instead stays on one line and
 * its font size shrinks until it fits the available width.
 */
function FittingText({ text, autoFit, className }: { text: string; autoFit: boolean; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !autoFit) return;
    const fit = () => {
      el.style.fontSize = '';
      let size = Number.parseFloat(window.getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth && size > MIN_FONT_SIZE_PX) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (el.parentElement) observer.observe(el.parentElement);
    return () => observer.disconnect();
  }, [autoFit, text]);

  return (
    <span ref={ref} className={cn('block', autoFit ? 'whitespace-nowrap' : 'break-words', className)}>
      {text}
    </span>
  );
}

export function SettingsItemContainer({
  title,
  description,
  autoFitText = false,
  icon: Icon = Settings,
  iconImageSrc,
  iconNode,
  iconBadge,
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
  const pathname = usePathname();
  /**
   * Multi-click guard for navigation and loading: once the item has
   * been activated, further activations are ignored while the
   * navigation it started is in flight or the action it triggered is
   * still running. For links the guard lifts when the route changes;
   * for button actions it lifts when the handler settles (an action
   * that navigates away unmounts or re-routes first anyway).
   */
  const [activating, setActivating] = React.useState(false);

  React.useEffect(() => {
    setActivating(false);
  }, [pathname]);

  function handleLinkClick(e: React.MouseEvent) {
    if (activating) {
      e.preventDefault();
      return;
    }
    setActivating(true);
  }

  async function handleButtonClick() {
    if (activating) return;
    setActivating(true);
    try {
      await onClick?.();
    } finally {
      setActivating(false);
    }
  }

  const overlayClassName = cn(
    'absolute inset-0 rounded-[inherit] transition-colors',
    'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
    activating && 'pointer-events-none'
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
          <a href={href} aria-label={title} aria-disabled={activating || undefined} onClick={handleLinkClick} className={overlayClassName} />
        ) : (
          <Link href={href} aria-label={title} aria-disabled={activating || undefined} onClick={handleLinkClick} className={overlayClassName} />
        )
      ) : onClick !== undefined ? (
        <button type="button" aria-label={title} disabled={activating} onClick={() => void handleButtonClick()} className={cn(overlayClassName, 'cursor-pointer')} />
      ) : null}

      <span aria-hidden="true" className="pointer-events-none relative shrink-0">
        <span
          className="flex size-8 items-center justify-center overflow-hidden rounded-md"
          style={{ backgroundColor: iconBackgroundColor }}
        >
          {iconImageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconImageSrc} alt="" className="size-full object-cover" />
          ) : iconNode !== undefined ? (
            <span className="flex items-center justify-center text-white">{iconNode}</span>
          ) : (
            <Icon className="size-4.5 text-white" />
          )}
        </span>
        {iconBadge !== undefined && (
          <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-background shadow ring-1 ring-border">
            {iconBadge}
          </span>
        )}
      </span>
      <span className="pointer-events-none min-w-0 flex-1">
        <FittingText text={title} autoFit={autoFitText} className="text-sm font-medium" />
        {description !== undefined && (
          <FittingText text={description} autoFit={autoFitText} className="text-sm text-muted-foreground" />
        )}
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
