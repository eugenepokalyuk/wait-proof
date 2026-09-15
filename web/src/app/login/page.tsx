import { Suspense } from 'react';

import { AuthForm } from './_components/AuthForm/AuthForm';

export const metadata = { title: 'Вход' };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}
