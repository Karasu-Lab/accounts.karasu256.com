'use client';

import { RadioGroup, RadioGroupItem } from '@karasu-lab/ui';
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
    <SettingsItemContainer
      title={title}
      description={description}
      autoFitText={autoFitText}
      icon={icon}
      iconImageSrc={iconImageSrc}
      iconNode={iconNode}
      iconBackgroundColor={iconBackgroundColor}
      disabled={disabled}
      trailing={
        <RadioGroup value={value} onValueChange={onValueChange} disabled={disabled || onValueChange === undefined} className="flex gap-4">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-1.5 text-sm">
              <RadioGroupItem value={option.value} />
              {option.label}
            </label>
          ))}
        </RadioGroup>
      }
      hasItemAbove={hasItemAbove}
      hasItemBelow={hasItemBelow}
    />
  );
}
