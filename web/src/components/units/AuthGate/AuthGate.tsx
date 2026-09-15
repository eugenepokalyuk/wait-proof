'use client';

import React, { FC, PropsWithChildren, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useAppSelector } from '@/store/hooks';
import { Routes } from '@/utils/consts';

/** Пускает дальше только вошедших. Остальных — на вход с возвратом сюда же,
 *  чтобы ссылка-приглашение не терялась по дороге через регистрацию. */
export const AuthGate: FC<PropsWithChildren> = ({ children }) => {
  const { hydrated, access } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // Первый клиентский рендер обязан совпасть с серверным, а сервер не знает
  // о токенах и рисует пустоту. Без этого флага страница, открытая уже
  // вошедшим, ломала бы гидратацию
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (hydrated && !access) {
      const next = `${pathname}${search ? `?${search}` : ''}`;
      router.replace(`${Routes.Login}?next=${encodeURIComponent(next)}`);
    }
  }, [hydrated, access, pathname, search, router]);

  if (!mounted || !hydrated || !access) return null;
  return <>{children}</>;
};
