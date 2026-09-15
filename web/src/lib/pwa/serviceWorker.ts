import { BASE_PATH } from '@/utils/consts';

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

export const registerServiceWorker = () => {
  if (registration) return registration;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }
  registration = navigator.serviceWorker
    .register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` })
    .catch(() => null);
  return registration;
};
