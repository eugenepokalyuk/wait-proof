import { Suspense } from 'react';

import { AuthGate } from '@/components/units';

import { HistoryView } from './_components/HistoryView/HistoryView';

export const metadata = { title: 'История' };

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <HistoryView />
      </AuthGate>
    </Suspense>
  );
}
