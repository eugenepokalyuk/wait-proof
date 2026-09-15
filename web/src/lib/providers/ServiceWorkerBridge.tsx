'use client';

import { FC, useEffect } from 'react';

import { getPushState, subscribePush } from '@/lib/push';
import { getDeviceId, registerServiceWorker } from '@/lib/pwa';
import { api, useConfigQuery, useSubscribeDeviceMutation } from '@/store/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/** Связь с service worker: регистрация, свежий пуш → обновить данные, и
 *  переотправка подписки при каждом запуске. Браузер может сменить адрес
 *  подписки молча, и без переотправки пуши просто перестали бы приходить. */
export const ServiceWorkerBridge: FC = () => {
  const dispatch = useAppDispatch();
  const signedIn = useAppSelector((state) => Boolean(state.auth.access));
  const { data: config } = useConfigQuery(undefined, { skip: !signedIn });
  const [subscribe] = useSubscribeDeviceMutation();

  useEffect(() => {
    registerServiceWorker();
    if (!('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'push') {
        // Пришёл пуш — значит, что-то поменялось у второго участника.
        // Не ждём следующего опроса, перечитываем сразу
        dispatch(api.util.invalidateTags(['Timer', 'Timers', 'Friends', 'Requests']));
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [dispatch]);

  useEffect(() => {
    if (!signedIn || !config?.vapid_public_key) return;
    if (getPushState() !== 'granted') return;
    // Разрешение уже есть — subscribePush не покажет диалог, только вернёт
    // текущую подписку или оформит новую
    subscribePush(config.vapid_public_key)
      .then((body) => {
        if (body) {
          subscribe({ ...body, device_id: getDeviceId(), user_agent: navigator.userAgent });
        }
      })
      .catch(() => undefined);
  }, [signedIn, config?.vapid_public_key, subscribe]);

  return null;
};
