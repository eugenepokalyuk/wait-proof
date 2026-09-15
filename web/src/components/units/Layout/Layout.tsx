'use client';

import React, { FC, PropsWithChildren } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, m } from 'framer-motion';

import { useOnline } from '@/lib/hooks';
import { quick } from '@/lib/motion';
import { useAppSelector } from '@/store/hooks';
import { Routes } from '@/utils/consts';

import { TabBar } from '../TabBar/TabBar';
import { Toaster } from '../Toaster/Toaster';

import classes from './Layout.module.scss';

const withoutTabs = [Routes.Login, Routes.Install];

export const Layout: FC<PropsWithChildren> = ({ children }) => {
  const pathname = usePathname();
  const online = useOnline();
  const signedIn = useAppSelector((state) => Boolean(state.auth.access));
  const showTabs =
    signedIn && !withoutTabs.some((route) => pathname.startsWith(route));

  return (
    <>
      <AnimatePresence>
        {!online && (
          <m.div
            className={classes.offline}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={quick}
            role="status"
          >
            Нет связи — показываем последнее известное
          </m.div>
        )}
      </AnimatePresence>
      <main className={showTabs ? classes.withTabs : classes.main}>{children}</main>
      {showTabs && <TabBar />}
      <Toaster />
    </>
  );
};
