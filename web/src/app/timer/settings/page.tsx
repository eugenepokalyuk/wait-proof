import { Suspense } from 'react';

import { AuthGate } from '@/components/units';

import { TimerSettingsView } from './_components/TimerSettingsView/TimerSettingsView';

export const metadata = { title: 'Настройки таймера' };

export default function TimerSettingsPage() {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <TimerSettingsView />
      </AuthGate>
    </Suspense>
  );
}
