import { Suspense } from 'react';

import { AuthGate } from '@/components/units';

import { TimerView } from './_components/TimerView/TimerView';

export default function TimerPage() {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <TimerView />
      </AuthGate>
    </Suspense>
  );
}
