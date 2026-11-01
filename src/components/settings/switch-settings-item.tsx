'use client';

import { Switch } from '@karasu-lab/ui';
import { SettingsItemContainer, type SettingsItemContainerProps } from './settings-item-container';

export interface SwitchSettingsItemProps {
  /** Item heading, forwarded to {@link SettingsItemContainer}. */
  title: SettingsItemContainerProps['title'];
  /** Supporting text, forwarded to {@link SettingsItemContainer}. */
  description?: SettingsItemContainerProps['description'];
  /** Whether the title and description auto-fit, forwarded to {@link SettingsItemContainer}. */
  autoFitText?: SettingsItemContainerProps['autoFitText'];
  /** Icon shown in the colored tile, forwarded to {@link SettingsItemContainer}. */
  icon?: SettingsItemContainerProps['icon'];
  /** Image shown in the tile instead of {@link icon}, forwarded to {@link SettingsItemContainer}. */
  iconImageSrc?: SettingsItemContainerProps['iconImageSrc'];
  /** Custom icon content, forwarded to {@link SettingsItemContainer}. */
  iconNode?: SettingsItemContainerProps['iconNode'];
  /** Icon tile background color, forwarded to {@link SettingsItemContainer}. */
  iconBackgroundColor?: SettingsItemContainerProps['iconBackgroundColor'];
  /** The boolean value the item carries, shown as the switch's state. */
  checked: boolean;
  /**
   * Invoked with the next value when the value is flipped — by the
   * switch itself or by pressing the item. Omit for a display-only
   * item: the switch then renders disabled and the item is not
   * pressable, so the value reads as information, not a control.
   */
  onCheckedChange?: (checked: boolean) => void;
  /**
   * Disables the switch (and the item's press target) while keeping
   * the item visible — for a value that exists but cannot be changed
   * right now, such as while a change is being saved.
   */
  disabled?: boolean;
  /** Whether an item sits directly above this one, forwarded to {@link SettingsItemContainer}. */
  hasItemAbove?: boolean;
  /** Whether an item sits directly below this one, forwarded to {@link SettingsItemContainer}. */
  hasItemBelow?: boolean;
}

/**
 * A {@link SettingsItemContainer} extended for a boolean value: the
 * item's trailing content is a `Switch` showing the value. With an
 * {@link SwitchSettingsItemProps.onCheckedChange} handler the whole
 * item is pressable and pressing it flips the value, exactly like
 * flipping the switch; without one the item only displays the value.
 */
export function SwitchSettingsItem({
  title,
  description,
  autoFitText,
  icon,
  iconImageSrc,
  iconNode,
  iconBackgroundColor,
  checked,
  onCheckedChange,
  disabled = false,
  hasItemAbove,
  hasItemBelow,
}: SwitchSettingsItemProps) {
  const interactive = onCheckedChange !== undefined;

  return (
    <SettingsItemContainer
      title={title}
      description={description}
      autoFitText={autoFitText}
      icon={icon}
      iconImageSrc={iconImageSrc}
      iconNode={iconNode}
      iconBackgroundColor={iconBackgroundColor}
      onClick={interactive && !disabled ? () => onCheckedChange(!checked) : undefined}
      trailing={
        <Switch
          checked={checked}
          disabled={disabled || !interactive}
          onCheckedChange={interactive ? onCheckedChange : undefined}
          aria-label={title}
        />
      }
      hasItemAbove={hasItemAbove}
      hasItemBelow={hasItemBelow}
    />
  );
}
