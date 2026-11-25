'use client';

import { useEffect, useState, type CSSProperties } from 'react';

interface IconShape {
  viewBox: string;
  path: string;
}

const shapes = new Map<string, Promise<IconShape | null>>();

function loadShape(iconUrl: string): Promise<IconShape | null> {
  let shape = shapes.get(iconUrl);
  if (!shape) {
    shape = fetch(iconUrl)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`${res.status}`))))
      .then((text) => {
        const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
        const viewBox = svg.getAttribute('viewBox');
        const path = svg.querySelector('path')?.getAttribute('d');
        return viewBox && path ? { viewBox, path } : null;
      })
      .catch(() => {
        shapes.delete(iconUrl);
        return null;
      });
    shapes.set(iconUrl, shape);
  }
  return shape;
}

export interface ProviderIconProps {
  iconUrl: string;
  className?: string;
  color?: { default: string; dark: string };
}

export function ProviderIcon({ iconUrl, className, color }: ProviderIconProps) {
  const [shape, setShape] = useState<IconShape | null>(null);

  useEffect(() => {
    let active = true;
    void loadShape(iconUrl).then((loaded) => {
      if (active) setShape(loaded);
    });
    return () => {
      active = false;
    };
  }, [iconUrl]);

  return (
    <svg
      aria-hidden
      viewBox={shape?.viewBox ?? '0 0 1 1'}
      fill="currentColor"
      className={`shrink-0 ${color ? 'text-(--icon-color) dark:text-(--icon-color-dark)' : ''} ${className ?? ''}`}
      style={color ? ({ '--icon-color': color.default, '--icon-color-dark': color.dark } as CSSProperties) : undefined}
    >
      {shape && <path d={shape.path} />}
    </svg>
  );
}
