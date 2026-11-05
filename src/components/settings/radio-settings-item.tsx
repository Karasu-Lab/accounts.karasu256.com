'use client';

import { RadioGroup } from '@karasu-lab/ui';
import { SettingsItemContainer, type SettingsItemContainerProps } from './settings-item-container';

export interface RadioSettingsItemOption {
  value: string;
  label: string;
}

export interface RadioSettingsItemProps {
  title: SettingsItemContainerProps['title'];
  description?: SettingsItemContainerProps['description'];
  autoFitText?: SettingsItemContainerProps['autoFitText'];
  icon?: SettingsItemContainerProps['icon'];
  iconImageSrc?: SettingsItemContainerProps['iconImageSrc'];
  iconNode?: SettingsItemContainerProps['iconNode'];
  iconBackgroundColor?: SettingsItemContainerProps['iconBackgroundColor'];
  options: RadioSettingsItemOption[];
  value: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  hasItemAbove?: boolean;
  hasItemBelow?: boolean;
}

export function RadioSettingsItem({
  title,
  description,
  autoFitText,
  icon,
  iconImageSrc,
  iconNode,
  iconBackgroundColor,
  options,
  value,
  onValueChange,
  disabled = false,
  hasItemAbove,
  hasItemBelow,
}: RadioSettingsItemProps) {
  return (
    <RadioGroup value={value} onValueChange={onValueChange} disabled={disabled || onValueChange === undefined}>
      <SettingsItemContainer
        title={title}
        description={description}
        autoFitText={autoFitText}
        icon={icon}
        iconImageSrc={iconImageSrc}
        iconNode={iconNode}
        iconBackgroundColor={iconBackgroundColor}
        items={options.map((option) => ({
          key: option.value,
          title: option.label,
          radioValue: option.value,
          disabled,
          onClick: disabled || onValueChange === undefined ? undefined : () => onValueChange(option.value),
        }))}
        hasItemAbove={hasItemAbove}
        hasItemBelow={hasItemBelow}
      />
    </RadioGroup>
  );
}
