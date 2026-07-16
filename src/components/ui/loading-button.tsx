'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Button, Spinner } from '@Hashibutogarasu/ui';

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  /** Whether the action this button triggers is in flight. */
  loading: boolean;
  /** Icon rendered before `children` when not loading; replaced by a spinner while loading. */
  icon?: ReactNode;
}

/**
 * {@link Button} that swaps its leading icon for a {@link Spinner} while
 * `loading` is true, so callers don't have to inline that ternary themselves.
 */
export function LoadingButton({ loading, icon, children, ...props }: LoadingButtonProps) {
  return (
    <Button {...props}>
      {loading ? <Spinner /> : icon}
      {children}
    </Button>
  );
}
