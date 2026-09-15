import { Suspense } from 'react';

import { AuthGate } from '@/components/units';

import { ProfileView } from './_components/ProfileView/ProfileView';

export const metadata = { title: 'Профиль' };

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <ProfileView />
      </AuthGate>
    </Suspense>
  );
}
