import { Suspense } from 'react';

import { AuthGate } from '@/components/units';

import { FriendsView } from './_components/FriendsView/FriendsView';

export const metadata = { title: 'Друзья' };

export default function FriendsPage() {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <FriendsView />
      </AuthGate>
    </Suspense>
  );
}
