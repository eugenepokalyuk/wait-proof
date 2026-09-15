// Service worker приложения «Я тебя жду».
//
// Три задачи: показать пуш, открыть нужный таймер по тапу и держать
// оболочку приложения в кэше, чтобы оно открывалось без сети. Запросы к API
// не трогаем вовсе — они на другом домене, и старое положение тумблера из
// кэша хуже, чем честное «нет связи».

const STATIC_CACHE = 'wp-static-v1';
const PAGES_CACHE = 'wp-pages-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [STATIC_CACHE, PAGES_CACHE];
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith('wp-') && !keep.includes(key)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Ассеты Next с хэшем в имени не меняются никогда — сразу из кэша
  if (url.pathname.includes('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Страницы — сначала сеть: после выкатки человек должен увидеть новую
  // версию, а кэш нужен только когда сети нет
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES_CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(url.pathname, response.clone());
          return response;
        } catch {
          return (
            (await cache.match(url.pathname)) ||
            (await cache.match(new URL('./', self.registration.scope).pathname)) ||
            Response.error()
          );
        }
      })(),
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const scope = self.registration.scope;
  const url = new URL(data.url || '', scope).href;

  event.waitUntil(
    (async () => {
      // Показываем уведомление на каждый пуш без исключений: iOS отзывает
      // подписку у приложений, которые получают пуш и ничего не показывают
      await self.registration.showNotification(data.title || 'Я тебя жду', {
        body: data.body || '',
        tag: data.tag,
        renotify: Boolean(data.tag),
        icon: `${scope}icons/icon-192.png`,
        badge: `${scope}icons/badge-96.png`,
        data: { url },
      });

      // Открытое приложение перечитает данные сразу, не дожидаясь опроса
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      windows.forEach((client) => client.postMessage({ type: 'push', kind: data.kind, timerId: data.timer_id }));
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const own = windows.find((client) => client.url.startsWith(self.registration.scope));
      if (own) {
        await own.focus();
        if ('navigate' in own) {
          try {
            await own.navigate(url);
          } catch {
            // Окно не под контролем воркера — хватит и фокуса
          }
        }
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
