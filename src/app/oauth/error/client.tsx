'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Container, CardContent, CardHeader } from '@Hashibutogarasu/ui';
import { Button } from '@Hashibutogarasu/ui';

/**
 * Displays an error message when the OAuth sign-in flow fails.
 *
 * Translates better-auth's `error` query parameter directly via
 * `oauthError.{error}`; falls back to a generic message for unknown or
 * missing codes.
 */
export function OAuthErrorClient() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const code = searchParams.get('error');

  const key = code ? `oauthError.${code}` : null;
  const message = key && t.has(key) ? t(key) : t('oauthError.message');

  return (
    <Container className="max-w-sm">
      <CardHeader className="text-lg font-semibold">{t('oauthError.title')}</CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            window.location.href = '/';
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          {t('oauthError.backToSignIn')}
        </Button>
      </CardContent>
    </Container>
  );
}
