import type { NextConfig } from 'next';

// GitHub Pages раздаёт только статику, поэтому собираем экспорт в out/.
// Приложение живёт в подпапке eugenepokalyuk.github.io/wait-proof — префикс
// задаёт workflow через NEXT_PUBLIC_BASE_PATH. Локально он пустой.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'export',
  basePath,
  // Без слеша на конце Pages отдаёт 404 на /friends: он ищет friends.html,
  // а экспорт кладёт friends/index.html.
  trailingSlash: true,
  images: { unoptimized: true },
  // Номер сборки уходит в service worker и в кэш: новая выкатка не должна
  // отдавать старую оболочку из кэша телефона.
  env: { NEXT_PUBLIC_BUILD_ID: process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev' },
};

export default nextConfig;
