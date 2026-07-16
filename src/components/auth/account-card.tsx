'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { authClient } from '@/lib/auth/client';
import { Button } from '@Hashibutogarasu/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@Hashibutogarasu/ui';
import { Identicon } from '@Hashibutogarasu/ui';
import { Separator } from '@Hashibutogarasu/ui';
import { Skeleton } from '@Hashibutogarasu/ui';
import { PasskeyList } from './passkey-list';
import { PasskeyCreateDialog } from './passkey-create-dialog';

/** Account management card for authenticated users, driven by the better-auth session. */
export function AccountCard() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [passkeyVersion, setPasskeyVersion] = useState(0);

  useEffect(() => {
    if (!isPending && !session) router.replace('/');
  }, [isPending, session, router]);

  async function handleSignOut() {
    await authClient.signOut();
  }

  if (isPending || !session) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-start gap-3">
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Separator />
          <Skeleton className="h-3 w-16" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="size-7 rounded-md" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-7 rounded-md" />
            </div>
          </div>
          <Separator />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Signed in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-start gap-3">
          <Identicon value={session.user.id} size={64} className="border border-border" />
          <p className="text-sm text-muted-foreground break-all">{session.user.email ?? session.user.id}</p>
        </div>
        <Separator />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Passkeys</p>
        <PasskeyList version={passkeyVersion} />
        {session.user.email && <PasskeyCreateDialog onSuccess={() => setPasskeyVersion((v) => v + 1)} />}
        <Separator />
        <Button variant="ghost" className="w-full" onClick={() => router.push('/settings')}>
          Settings
        </Button>
        <Button variant="outline" className="w-full" onClick={handleSignOut}>
          <FontAwesomeIcon icon={faRightFromBracket} />
          Sign Out
        </Button>
      </CardContent>
    </Card>
  );
}
