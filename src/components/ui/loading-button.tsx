'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Button, Spinner } from '@karasu-lab/ui';

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  /** Whether the action this button triggers is in flight. */
  loading: boolean;
  /** Icon rendered before `children` when not loading; replaced by a spinner while loading. */
  icon?: ReactNode;
}

/**
 * {@link Button} that swaps its leading icon for a {@link Spinner} while
 * `loading` is true, so callers don't have to inline that ternary themselves.
 *
 * While `loading` is true the button is always disabled, so an action
 * that is already in flight can never be triggered twice by repeated
 * clicks, even if the caller forgot to pass `disabled`.
 */
export function LoadingButton({ loading, icon, children, disabled, ...props }: LoadingButtonProps) {
  return (
    <Button {...props} disabled={loading || disabled}>
      {loading ? <Spinner /> : icon}
      {children}
    </Button>
  );
}
