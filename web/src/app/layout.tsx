import React from 'react';
import type { Metadata, Viewport } from 'next';
import 'normalize.css';

import { Layout } from '@/components/units';
import { AppProviders } from '@/lib/providers';
import { BASE_PATH } from '@/utils/consts';

import '../styles/globals.scss';

export const metadata: Metadata = {
  title: { default: 'Я тебя жду', template: '%s · Я тебя жду' },
  description: 'Огромный тумблер, который раз и навсегда решает, кто кого ждал.',
  applicationName: 'Я тебя жду',
  // Пути в metadata Next не префиксует сам — на Pages без BASE_PATH иконки
  // и manifest ушли бы в корень домена и отдали 404
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    title: 'Жду',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: `${BASE_PATH}/icons/favicon-64.png`, sizes: '64x64', type: 'image/png' }],
    apple: [{ url: `${BASE_PATH}/icons/apple-touch-icon.png`, sizes: '180x180' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // cover — чтобы фон уходил под чёлку и полоску «Домой», а отступы
  // брались из safe-area в стилях
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f0eb' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0d11' },
  ],
};

export default function RootLayout({ children }: Readonly<React.PropsWithChildren>) {
  return (
    <html lang="ru">
      <body>
        <AppProviders>
          <Layout>{children}</Layout>
        </AppProviders>
      </body>
    </html>
  );
}
