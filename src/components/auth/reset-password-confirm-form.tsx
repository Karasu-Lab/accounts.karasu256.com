'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faKey } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { Button } from '@Hashibutogarasu/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@Hashibutogarasu/ui';
import { Input } from '@Hashibutogarasu/ui';
import { Label } from '@Hashibutogarasu/ui';

interface Props {
  token: string;
}

/** Lets the user set a new password using the one-time token from the reset email link. */
export function ResetPasswordConfirmForm({ token }: Props) {
  const t = useTranslations();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('resetPassword.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive">{t('resetPassword.invalidToken')}</p>
          <Link href="/reset-password" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <FontAwesomeIcon icon={faArrowLeft} />
            {t('resetPassword.requestAgain')}
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      toast.error(error.message ?? t('resetPassword.invalidToken'));
    } else {
      setDone(true);
    }
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('resetPassword.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('resetPassword.setDone')}</p>
            <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <FontAwesomeIcon icon={faArrowLeft} />
              {t('resetPassword.backToSignIn')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('resetPassword.newPassword')}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <FontAwesomeIcon icon={faKey} />
              {loading ? t('resetPassword.setting') : t('resetPassword.setPassword')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
