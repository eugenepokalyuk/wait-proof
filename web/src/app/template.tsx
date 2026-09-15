'use client';

import React from 'react';
import { m } from 'framer-motion';

import { quick } from '@/lib/motion';

// template пересоздаётся на каждый переход — лёгкое появление экрана.
// Без анимации ухода: в App Router она требует держать старую страницу
// живой, а 180 мс появления достаточно, чтобы переход не был рывком.
export default function Template({ children }: React.PropsWithChildren) {
  return (
    <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={quick}>
      {children}
    </m.div>
  );
}
