import type { CSSProperties } from 'react';

export interface ProviderIconProps {
  iconUrl: string;
  className?: string;
  color?: { default: string; dark: string };
}

export function ProviderIcon({ iconUrl, className, color }: ProviderIconProps) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current ${color ? 'text-(--icon-color) dark:text-(--icon-color-dark)' : ''} ${className ?? ''}`}
      style={
        {
          ...(color ? { '--icon-color': color.default, '--icon-color-dark': color.dark } : {}),
          maskImage: `url(${iconUrl})`,
          WebkitMaskImage: `url(${iconUrl})`,
          maskPosition: 'center',
          maskRepeat: 'no-repeat',
          maskSize: 'contain',
        } as CSSProperties
      }
    />
  );
}
