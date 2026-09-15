import { isIOS, isStandalone, registerServiceWorker } from '@/lib/pwa';

export type PushState =
  | 'unsupported'
  | 'needs-install'
  | 'default'
  | 'denied'
  | 'granted';

export const getPushState = (): PushState => {
  if (typeof window === 'undefined') return 'unsupported';
  // На iOS Web Push есть только у приложения на экране «Домой»: в Safari
  // PushManager просто отсутствует. Говорим человеку, что делать, а не
  // «не поддерживается».
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return 'unsupported';
  }
  return Notification.permission as PushState;
};

const toUint8 = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export interface SubscriptionBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Подписка этого устройства. Спрашивает разрешение, если его ещё нет —
 *  поэтому вызывать только из обработчика нажатия: Safari отказывает в
 *  запросе, пришедшем не от жеста. */
export const subscribePush = async (
  vapidKey: string,
): Promise<SubscriptionBody | null> => {
  const registration = await registerServiceWorker();
  if (!registration || !vapidKey) return null;

  if (Notification.permission !== 'granted') {
    const answer = await Notification.requestPermission();
    if (answer !== 'granted') return null;
  }

  const ready = await navigator.serviceWorker.ready;
  let subscription = await ready.pushManager.getSubscription();
  if (!subscription) {
    subscription = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8(vapidKey),
    });
  }
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
};

export const currentSubscription = async () => {
  if (getPushState() !== 'granted') return null;
  const registration = await registerServiceWorker();
  if (!registration) return null;
  const ready = await navigator.serviceWorker.ready;
  return ready.pushManager.getSubscription();
};
