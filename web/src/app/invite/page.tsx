import { Suspense } from 'react';

import { AuthGate } from '@/components/units';

import { InviteView } from './_components/InviteView/InviteView';

export const metadata = { title: 'Приглашение' };

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <InviteView />
      </AuthGate>
    </Suspense>
  );
}
