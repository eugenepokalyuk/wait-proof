'use client';

import React, { FC, PropsWithChildren } from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';

const loadFeatures = () => import('./features').then((mod) => mod.default);

export const MotionProvider: FC<PropsWithChildren> = ({ children }) => (
  // strict: случайный motion.div вместо m.div уронит сборку в dev, а не
  // молча притащит всю библиотеку в бандл.
  <LazyMotion features={loadFeatures} strict>
    {/* «Уменьшить движение» в системе гасит анимации до мгновенных смен */}
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);
