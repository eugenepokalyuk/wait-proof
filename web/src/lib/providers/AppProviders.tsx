'use client';

import React, { FC, PropsWithChildren } from 'react';
import { Provider } from 'react-redux';

import { MotionProvider } from '@/lib/motion';
import { store } from '@/store/store';

import { AuthHydrator } from './AuthHydrator';
import { ServiceWorkerBridge } from './ServiceWorkerBridge';

export const AppProviders: FC<PropsWithChildren> = ({ children }) => (
  <Provider store={store}>
    <MotionProvider>
      <AuthHydrator />
      <ServiceWorkerBridge />
      {children}
    </MotionProvider>
  </Provider>
);
