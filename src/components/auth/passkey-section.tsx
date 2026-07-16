'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFingerprint } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { Button, Spinner } from '@Hashibutogarasu/ui';

export interface PasskeySectionProps {
  /** Called after a successful sign-in, instead of the default redirect to `/settings`. */
  onSuccess?: () => void;
  /** Disables the button, e.g. while the caller's session state hasn't loaded yet. Defaults to `false`. */
  disabled?: boolean;
}

/** Renders the passkey sign-in button for unauthenticated users. */
export function PasskeySection({ onSuccess, disabled = false }: PasskeySectionProps = {}) {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  /**
   * Checks the returned `error` directly rather than `fetchOptions.onError`,
   * since WebAuthn cancellation surfaces there but not always through that
   * callback (which only fires for server-side failures).
   */
  async function handleSignIn() {
    setLoading(true);
    const result = await authClient.signIn.passkey();
    if (result?.error) {
      toast.error(result.error.message ?? t('passkey.error.unknown'));
      setLoading(false);
      return;
    }
    if (onSuccess) onSuccess();
    else router.replace('/settings');
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleSignIn} disabled={disabled || loading}>
      {loading ? <Spinner /> : <FontAwesomeIcon icon={faFingerprint} />}
      {loading ? t('passkey.waiting') : t('passkey.signIn')}
    </Button>
  );
}
