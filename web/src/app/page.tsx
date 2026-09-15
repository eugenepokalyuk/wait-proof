import { Suspense } from 'react';

import { AuthGate } from '@/components/units';

import { HomeView } from './home/_components/HomeView/HomeView';

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <HomeView />
      </AuthGate>
    </Suspense>
  );
}
