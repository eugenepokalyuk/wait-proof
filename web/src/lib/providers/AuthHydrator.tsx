'use client';

import { FC, useEffect } from 'react';

import { useAppDispatch } from '@/store/hooks';
import { authActions, readStoredAuth } from '@/store/slices/auth';

/** Читает токены после монтирования, а не при создании стора: страницы
 *  пререндерены без localStorage, и разный первый рендер на сервере и в
 *  браузере сломал бы гидрацию. */
export const AuthHydrator: FC = () => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(authActions.hydrated(readStoredAuth()));
  }, [dispatch]);
  return null;
};
