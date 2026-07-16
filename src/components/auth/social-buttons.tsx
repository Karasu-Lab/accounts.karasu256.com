'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';
import { Button, Spinner } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';

type Provider = 'google' | 'github';

/**
 * Renders Google and GitHub sign-in buttons. Delegates the OAuth handshake
 * to better-auth, which establishes its own session directly; `/auth/callback`
 * confirms the session landed before continuing to the settings page.
 */
export function SocialButtons() {
  const [loading, setLoading] = useState<Provider | null>(null);

  async function handleSignIn(provider: Provider) {
    setLoading(provider);
    const { error } = await authClient.signIn.social({ provider, callbackURL: '/auth/callback' });
    if (error) setLoading(null);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" onClick={() => handleSignIn('google')} disabled={loading === 'google'}>
        {loading === 'google' ? <Spinner /> : <FontAwesomeIcon icon={faGoogle} />}
        Google
      </Button>
      <Button variant="outline" onClick={() => handleSignIn('github')} disabled={loading === 'github'}>
        {loading === 'github' ? <Spinner /> : <FontAwesomeIcon icon={faGithub} />}
        GitHub
      </Button>
    </div>
  );
}
