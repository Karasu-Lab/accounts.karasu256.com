'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Container, CardContent, CardHeader, Button } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';

interface PublicClient {
  client_id: string;
  client_name?: string;
  logo_uri?: string;
}

function ConsentContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const scope = searchParams.get('scope') ?? '';

  const [client, setClient] = useState<PublicClient | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    authClient.oauth2.publicClient({ query: { client_id: clientId } }).then(({ data }) => setClient(data as PublicClient | null));
  }, [clientId]);

  async function respond(accept: boolean) {
    setSubmitting(true);
    try {
      const { data } = await authClient.oauth2.consent({ accept, scope });
      const url = (data as { url?: string } | null)?.url;
      if (url) window.location.href = url;
    } finally {
      setSubmitting(false);
    }
  }

  const scopes = scope.split(' ').filter(Boolean);

  return (
    <Container className="max-w-sm">
      <CardHeader className="text-lg font-semibold">{t('oauthConsent.title')}</CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('oauthConsent.description', { name: client?.client_name ?? clientId ?? '' })}</p>
        {scopes.length > 0 && (
          <ul className="list-disc pl-5 text-sm space-y-1">
            {scopes.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={submitting} onClick={() => respond(false)}>
            {t('oauthConsent.deny')}
          </Button>
          <Button className="flex-1" disabled={submitting} onClick={() => respond(true)}>
            {t('oauthConsent.accept')}
          </Button>
        </div>
      </CardContent>
    </Container>
  );
}

export function ConsentClient() {
  return (
    <Suspense>
      <ConsentContent />
    </Suspense>
  );
}
