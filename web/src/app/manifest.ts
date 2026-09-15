import type { MetadataRoute } from 'next';

import { BASE_PATH } from '@/utils/consts';

// Статический экспорт требует явного force-static для metadata-маршрутов
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Я тебя жду',
    short_name: 'Жду',
    description: 'Огромный тумблер, который решает, кто кого ждал.',
    lang: 'ru',
    // start_url и scope с префиксом: иначе установленное на iPhone
    // приложение открывается на корне github.io и показывает 404
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f0eb',
    theme_color: '#f4f0eb',
    icons: [
      { src: `${BASE_PATH}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${BASE_PATH}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
      {
        src: `${BASE_PATH}/icons/maskable-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
