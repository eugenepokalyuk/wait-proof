const KEY = 'wp.device';

let cached: string | null = null;

/** Постоянный id этого устройства.
 *  Сервер по нему не шлёт пуш на телефон, с которого только что щёлкнули,
 *  и заменяет подписку при переподписке вместо того, чтобы копить мёртвые. */
export const getDeviceId = (): string => {
  if (cached) return cached;
  if (typeof window === 'undefined') return '';
  try {
    cached = localStorage.getItem(KEY);
    if (!cached) {
      cached =
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(KEY, cached);
    }
  } catch {
    // Приватный режим Safari без localStorage — живём с id на сессию
    cached ??= Math.random().toString(36).slice(2);
  }
  return cached;
};
